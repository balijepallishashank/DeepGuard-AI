import os
import time
import tempfile
import hashlib
import logging
from typing import List, Dict, Any
from PIL import Image
import cv2

from fastapi import UploadFile, HTTPException, status
from app.model_loader import DeepfakeDetectorService
from app.schemas import VideoAnalysisResponse, FrameAnalysisResult, PredictionClassScore, ModelInformation

logger = logging.getLogger("deepfake_ai.video_processor")

MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".avi", ".mkv"}
MAX_SAMPLED_FRAMES = 16


def format_timestamp(seconds: float) -> str:
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins:02d}:{secs:02d}"


async def process_and_analyze_video(file: UploadFile) -> VideoAnalysisResponse:
    """
    Validates uploaded video file, writes to tempfile with automatic cleanup,
    extracts representative keyframes using OpenCV, and executes multi-keyframe
    spatial deepfake classification using the loaded SigLIP model.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a valid filename."
        )

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported video extension '{ext}'. Allowed extensions: {', '.join(sorted(ALLOWED_VIDEO_EXTENSIONS))}"
        )

    # Read raw content to compute SHA-256 and enforce size limits
    contents = await file.read()
    file_size = len(contents)
    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded video file is empty (0 bytes)."
        )

    if file_size > MAX_VIDEO_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"Video file size ({file_size / (1024*1024):.1f} MB) exceeds maximum limit of {MAX_VIDEO_SIZE_BYTES / (1024*1024):.0f} MB."
        )

    sha256_hash = hashlib.sha256(contents).hexdigest()

    # Get model instance
    detector = DeepfakeDetectorService.get_instance()
    if not detector.is_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Deepfake detection model is not ready: {detector.load_error or 'Model offline'}"
        )

    # Write to safe temporary file
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(contents)
            temp_path = tmp.name

        # Open video with OpenCV
        cap = cv2.VideoCapture(temp_path)
        if not cap.isOpened():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Failed to decode video container. File may be corrupted or use an unsupported video codec."
            )

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = float(cap.get(cv2.CAP_PROP_FPS))
        if fps <= 0 or total_frames <= 0:
            duration_sec = 0.0
            fps = 30.0
        else:
            duration_sec = round(total_frames / fps, 2)

        # Select frame indices for uniform sampling across video duration
        sample_count = min(MAX_SAMPLED_FRAMES, max(1, total_frames))
        if total_frames <= sample_count:
            frame_indices = list(range(total_frames))
        else:
            step = total_frames / sample_count
            frame_indices = [int(i * step) for i in range(sample_count)]

        start_time = time.perf_counter()
        frame_results: List[FrameAnalysisResult] = []
        fake_probabilities: List[float] = []
        suspicious_count = 0
        uninformative_frames_count = 0

        for sample_idx, frame_idx in enumerate(frame_indices):
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()
            if not ret or frame is None:
                continue

            # Quality Check: Exclude uninformative blank or flat monochrome frames (e.g. video fades/black screens)
            if frame.std() < 6.0:
                uninformative_frames_count += 1
                continue

            # Convert BGR OpenCV image to RGB PIL Image
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(rgb_frame)

            # Predict using shared PyTorch model instance
            pred = detector.predict(pil_img)

            timestamp_sec = round(frame_idx / fps, 2) if fps > 0 else 0.0
            timestamp_str = format_timestamp(timestamp_sec)

            scores_list = [
                PredictionClassScore(
                    label=s["label"],
                    raw_logit=s["raw_logit"],
                    probability=s["probability"],
                    percentage=s["percentage"]
                )
                for s in pred["scores"]
            ]

            frame_res = FrameAnalysisResult(
                frame_index=frame_idx,
                timestamp_sec=timestamp_sec,
                timestamp_str=timestamp_str,
                predicted_label=pred["predicted_label"],
                predicted_class_id=pred["predicted_class_id"],
                confidence_score=pred["confidence_score"],
                scores=scores_list
            )
            frame_results.append(frame_res)

            fake_score = next((s for s in pred["scores"] if s["label"] == "Fake"), None)
            fake_prob = fake_score["probability"] if fake_score else (0.0 if pred["predicted_label"] == "Real" else 1.0)
            fake_probabilities.append(fake_prob)

            if pred["predicted_label"] == "Fake":
                suspicious_count += 1

        cap.release()

        total_inference_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

        if not frame_results:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Could not extract usable, non-blank video frames from file."
            )

        # Robust Trimmed Aggregation & Conflict Detection
        # Avoid treating raw suspicious frame count as proof of synthetic origin
        sorted_probs = sorted(fake_probabilities)
        n_frames = len(sorted_probs)

        # Trim top and bottom outliers if we have at least 5 sampled frames
        if n_frames >= 5:
            trim_count = max(1, int(n_frames * 0.15))
            trimmed_probs = sorted_probs[trim_count:-trim_count] if (n_frames - 2 * trim_count) >= 3 else sorted_probs
        else:
            trimmed_probs = sorted_probs

        avg_fake_prob = sum(trimmed_probs) / len(trimmed_probs)
        fake_pct = round(avg_fake_prob * 100, 2)

        # Compute standard deviation across all usable frame probabilities to detect conflicting evidence
        mean_all = sum(fake_probabilities) / n_frames
        variance = sum((p - mean_all) ** 2 for p in fake_probabilities) / n_frames
        std_dev = variance ** 0.5

        # Decision Strategy:
        # 1. High inter-frame disagreement (std_dev > 0.28) -> INCONCLUSIVE (Conflicting Frame Predictions)
        # 2. Ambiguous trimmed activation margin (0.42 to 0.58) -> INCONCLUSIVE (Ambiguous Video Evidence)
        # 3. Consistent synthetic consensus (avg_fake_prob > 0.58 and std_dev <= 0.28) -> Likely AI-Generated
        # 4. Consistent authentic consensus (avg_fake_prob < 0.42 and std_dev <= 0.28) -> Likely Authentic
        if std_dev > 0.28 and n_frames >= 4:
            video_classification = "Inconclusive / Conflicting Frame Predictions"
            overall_confidence = round(max(0.35, 1.0 - std_dev), 4)
        elif 0.42 <= avg_fake_prob <= 0.58:
            video_classification = "Inconclusive / Ambiguous Video Evidence"
            overall_confidence = round(1.0 - abs(avg_fake_prob - 0.5) * 2, 4)
        elif avg_fake_prob > 0.58:
            video_classification = "Likely AI-Generated Video"
            overall_confidence = round(avg_fake_prob, 4)
        else:
            video_classification = "Likely Authentic Video"
            overall_confidence = round(1.0 - avg_fake_prob, 4)

        return VideoAnalysisResponse(
            success=True,
            filename=file.filename,
            sha256=sha256_hash,
            file_size_bytes=file_size,
            duration_seconds=duration_sec,
            fps=fps,
            total_frames_in_video=total_frames,
            sampled_frames_count=len(frame_results),
            video_classification=video_classification,
            overall_confidence=overall_confidence,
            fake_probability_percentage=fake_pct,
            suspicious_frames_count=suspicious_count,
            device_used=detector.device,
            inference_time_ms=total_inference_time_ms,
            analysis_type="Frame-Sampled Spatial Keyframe Analysis (Trimmed-Consensus)",
            methodology_disclaimer=(
                "Exploratory frame-based keyframe spatial analysis with trimmed-median consensus. "
                "Evaluates independently sampled frames; lacks validated 3D temporal spatiotemporal video deepfake detection. "
                "Frame predictions represent static spatial activations and must not be interpreted as temporal deepfake certainty."
            ),
            frame_results=frame_results,
            model_info=ModelInformation(
                model_id=detector.model_id,
                architecture="Frame-Based Multi-Keyframe Spatial Sampling (Exploratory)",
                base_backbone="google/vit-base-patch16-224-in21k / SigLIP",
                num_parameters=detector.num_parameters,
                license="Apache-2.0",
                active_engine="candidate" if detector.candidate_ready else "baseline_fallback",
                fallback_used=not detector.candidate_ready
            ),
            forensic_caveat=(
                "Frame-sampled video analysis evaluates spatial visual anomalies across individual decoded frames. "
                "This pipeline does NOT incorporate dedicated temporal recurrence, optical flow consistency, or 3D CNNs. "
                "Frame predictions represent static image activations and must not be interpreted as temporal deepfake certainty."
            )
        )

    finally:
        # Safe temporary file cleanup
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as clean_err:
                logger.warning(f"Could not remove temp video file {temp_path}: {clean_err}")
