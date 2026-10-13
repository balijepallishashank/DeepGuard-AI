import os
import time
import hashlib
import tempfile
import logging
from typing import List, Dict, Any
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
from fastapi import UploadFile, HTTPException, status

from app.schemas import (
    AudioAnalysisResponse,
    AudioSegmentResult,
    PredictionClassScore,
    ModelInformation
)
from app.audio_model_loader import AudioDeepfakeDetectorService

logger = logging.getLogger("deepfake_ai.audio_processor")

MAX_AUDIO_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
ALLOWED_AUDIO_EXTENSIONS = {".wav", ".mp3", ".ogg", ".flac", ".m4a"}
TARGET_SAMPLE_RATE = 16000
MIN_DURATION_SECONDS = 0.25
MAX_DURATION_SECONDS = 300.0  # 5 minutes


def compute_spectral_anomaly(waveform: np.ndarray, sr: int = TARGET_SAMPLE_RATE) -> float:
    """
    Computes an acoustic spectral anomaly score (0 to 100) based on high-frequency energy
    distribution and harmonic rolloff commonly altered in neural vocoder speech synthesis.
    """
    if len(waveform) < 512:
        return 15.0

    # Analyze up to 5 seconds of audio for spectral features
    sample_window = waveform[:min(len(waveform), sr * 5)]
    fft_vals = np.abs(np.fft.rfft(sample_window))
    freqs = np.fft.rfftfreq(len(sample_window), 1.0 / sr)

    # Calculate high-frequency energy ratio (> 4 kHz cutoff)
    cutoff = 4000.0
    high_energy = np.sum(fft_vals[freqs >= cutoff] ** 2)
    total_energy = np.sum(fft_vals ** 2) + 1e-9
    ratio = float(high_energy / total_energy)

    # Scale to 0-100 score
    score = round(min(98.5, max(8.0, ratio * 280.0)), 1)
    return score


def resample_waveform(waveform: np.ndarray, orig_sr: int, target_sr: int = TARGET_SAMPLE_RATE) -> np.ndarray:
    """
    Resamples mono float32 waveform from orig_sr to target_sr using polyphase filtering.
    """
    if orig_sr == target_sr:
        return waveform

    gcd = np.gcd(orig_sr, target_sr)
    up = target_sr // gcd
    down = orig_sr // gcd

    resampled = resample_poly(waveform, up, down).astype(np.float32)
    return resampled


async def process_and_analyze_audio(file: UploadFile) -> AudioAnalysisResponse:
    """
    Validates uploaded audio, extracts acoustic waveform, and executes
    Wav2Vec2 neural audio deepfake detection inference on CUDA/CPU.
    """
    start_total_time = time.perf_counter()

    # 1. Validate file extension
    filename = file.filename or "uploaded_audio.wav"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Unsupported audio format '{ext}'. DeepGuard AI supports "
                f"{', '.join(sorted(ALLOWED_AUDIO_EXTENSIONS))} audio files."
            )
        )

    # 2. Read bytes and check size
    contents = await file.read()
    file_size = len(contents)

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded audio file is empty (0 bytes)."
        )

    if file_size > MAX_AUDIO_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"Audio file size ({file_size / (1024*1024):.1f} MB) exceeds maximum limit of {MAX_AUDIO_SIZE_BYTES / (1024*1024):.0f} MB."
        )

    sha256_hash = hashlib.sha256(contents).hexdigest()

    # 3. Write temporary file and decode audio stream safely
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(contents)
            temp_path = tmp.name

        try:
            data, sample_rate = sf.read(temp_path, dtype="float32")
        except Exception as decode_err:
            logger.warning(f"Audio decoding failed for {filename}: {decode_err}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Corrupted or invalid audio file: could not decode stream ({str(decode_err)})"
            )

        # Multi-channel handling -> downmix to mono
        if data.ndim > 1:
            channels = data.shape[1]
            mono_data = np.mean(data, axis=1).astype(np.float32)
        else:
            channels = 1
            mono_data = data.astype(np.float32)

        duration_sec = len(mono_data) / sample_rate

        if duration_sec < MIN_DURATION_SECONDS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Audio duration ({duration_sec:.2f}s) is too short. Minimum duration is {MIN_DURATION_SECONDS}s."
            )

        if duration_sec > MAX_DURATION_SECONDS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Audio duration ({duration_sec:.1f}s) exceeds maximum allowed {MAX_DURATION_SECONDS}s."
            )

        # 4. Check model readiness (auto-initialize if not loaded)
        detector = AudioDeepfakeDetectorService.get_instance()
        if not detector.is_ready:
            detector.initialize()

        if not detector.is_ready:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    "Audio deepfake detection model is currently offline or still initializing. "
                    f"Status: {detector.load_error or 'Model not loaded'}"
                )
            )

        # 5. Resample to 16,000 Hz if necessary
        waveform_16k = resample_waveform(mono_data, sample_rate, TARGET_SAMPLE_RATE)

        # 6. Compute spectral anomaly score
        spectral_anomaly = compute_spectral_anomaly(waveform_16k, TARGET_SAMPLE_RATE)

        # 7. Model Inference (Full clip + sliding window segments)
        try:
            overall_pred = detector.predict(waveform_16k, sample_rate=TARGET_SAMPLE_RATE)
            segments_raw = detector.predict_segments(waveform_16k, sample_rate=TARGET_SAMPLE_RATE)
        except Exception as inf_err:
            logger.error(f"Inference error during audio analysis: {inf_err}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Audio inference pipeline failed: {str(inf_err)}"
            )

        # Format segment results
        segment_results = [
            AudioSegmentResult(
                segment_index=seg["segment_index"],
                start_time_sec=seg["start_time_sec"],
                end_time_sec=seg["end_time_sec"],
                timestamp_str=seg["timestamp_str"],
                predicted_label=seg["predicted_label"],
                confidence_score=seg["confidence_score"],
                fake_probability_percentage=seg["fake_probability_percentage"],
                scores=[
                    PredictionClassScore(
                        label=sc["label"],
                        raw_logit=sc["raw_logit"],
                        probability=sc["probability"],
                        percentage=sc["percentage"]
                    )
                    for sc in seg["scores"]
                ]
            )
            for seg in segments_raw
        ]

        total_inference_time = round((time.perf_counter() - start_total_time) * 1000, 2)

        return AudioAnalysisResponse(
            success=True,
            filename=filename,
            sha256=sha256_hash,
            file_size_bytes=file_size,
            duration_seconds=round(duration_sec, 2),
            sample_rate=sample_rate,
            channels=channels,
            device_used=overall_pred["device_used"],
            inference_time_ms=total_inference_time,
            predicted_label=overall_pred["predicted_label"],
            predicted_class_id=overall_pred["predicted_class_id"],
            confidence_score=overall_pred["confidence_score"],
            fake_probability_percentage=overall_pred["fake_probability_percentage"],
            spectral_anomaly_score=spectral_anomaly,
            scores=[
                PredictionClassScore(
                    label=sc["label"],
                    raw_logit=sc["raw_logit"],
                    probability=sc["probability"],
                    percentage=sc["percentage"]
                )
                for sc in overall_pred["scores"]
            ],
            segments=segment_results,
            model_info=ModelInformation(
                model_id=overall_pred["model_info"]["model_id"],
                architecture=overall_pred["model_info"]["architecture"],
                base_backbone=overall_pred["model_info"]["base_backbone"],
                num_parameters=overall_pred["model_info"]["num_parameters"],
                license=overall_pred["model_info"]["license"]
            ),
            forensic_caveat=overall_pred["forensic_caveat"]
        )

    finally:
        # Guarantee cleanup of temporary file on disk
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as clean_err:
                logger.warning(f"Failed to remove temporary audio file {temp_path}: {clean_err}")
