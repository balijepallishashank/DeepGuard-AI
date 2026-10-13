import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import HealthResponse, ImageAnalysisResponse, VideoAnalysisResponse, AudioAnalysisResponse
from app.validation import validate_and_load_image
from app.model_loader import DeepfakeDetectorService
from app.video_processor import process_and_analyze_video
from app.audio_model_loader import AudioDeepfakeDetectorService
from app.audio_processor import process_and_analyze_audio
from app.auth import get_current_user, AuthenticatedUser
from app.config import config
from app.cloud_provider import CloudInferenceService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("deepfake_ai.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load the deepfake detector model weights
    logger.info("Starting up Deepfake AI Forensic Service...")
    detector = DeepfakeDetectorService.get_instance()
    detector.initialize()
    audio_detector = AudioDeepfakeDetectorService.get_instance()
    audio_detector.initialize()
    yield
    # Shutdown
    logger.info("Shutting down Deepfake AI Forensic Service.")


app = FastAPI(
    title="Deepfake AI - Media Forensics & Detection API",
    description="Local open-source deepfake image and video detection inference powered by Hugging Face SigLIP and PyTorch.",
    version="1.1.0",
    lifespan=lifespan
)

# Enable CORS for the local React/Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Reports API operational status and model readiness.
    Distinguishes whether PyTorch CUDA acceleration is active.
    """
    detector = DeepfakeDetectorService.get_instance()
    audio_detector = AudioDeepfakeDetectorService.get_instance()
    is_ready = detector.is_ready

    status_str = "ok" if is_ready else "degraded"
    details = {
        "load_error": detector.load_error,
        "device": detector.device,
        "parameters": detector.num_parameters,
        "candidate_model_ready": detector.candidate_ready,
        "candidate_model_name": detector.candidate_model_id,
        "active_engine": "candidate" if detector.candidate_ready else "baseline_fallback",
        "audio_model_ready": audio_detector.is_ready,
        "audio_load_error": audio_detector.load_error,
        "audio_parameters": audio_detector.num_parameters,
        "cloud_inference_enabled": config.cloud_inference_enabled,
        "cloud_token_configured": config.has_hf_token,
        "cloud_model_id": config.primary_cloud_model
    }

    return HealthResponse(
        status=status_str,
        api_version="1.1.0",
        model_ready=is_ready,
        model_name=detector.model_id,
        audio_model_ready=audio_detector.is_ready,
        audio_model_name=audio_detector.model_id,
        device=detector.device,
        gpu_name=detector.gpu_name,
        details=details
    )


@app.get("/api/v1/auth/me")
async def get_my_profile(current_user: AuthenticatedUser = Depends(get_current_user)):
    """
    Returns verified token claims and user identity for the authenticated session.
    """
    return {
        "user_id": current_user.user_id,
        "email": current_user.email,
        "role": current_user.role
    }


@app.post("/api/v1/analyze/image", response_model=ImageAnalysisResponse)
async def analyze_image(
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Accepts an uploaded image, executes strict multi-point validation,
    and runs genuine deepfake classification inference using the loaded model.
    Seamlessly arbitrates with cloud-hosted inference if enabled, with automatic fallback.
    """
    detector = DeepfakeDetectorService.get_instance()

    # Verify model is ready
    if not detector.is_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Deepfake AI model is currently offline or still initializing. "
                f"Error: {detector.load_error or 'Model not loaded'}"
            )
        )

    # Validate image payload (size, magic bytes, PIL structure)
    pil_image, raw_bytes, sha256_hash, dimensions_str = await validate_and_load_image(file)

    try:
        # Run local model inference
        local_prediction = detector.predict(pil_image)

        # Attempt cloud-hosted inference if active
        cloud_service = CloudInferenceService.get_instance()
        cloud_result = await cloud_service.predict_image(raw_bytes)

        if cloud_result.success:
            local_label = local_prediction["predicted_label"]
            cloud_label = cloud_result.predicted_label

            # Evaluate consensus: discrepancy or ambiguous scores trigger INCONCLUSIVE
            if local_label != cloud_label or local_label == "Inconclusive" or cloud_label == "Inconclusive":
                predicted_label = "Inconclusive"
                predicted_class_id = -1
                confidence_score = round(max(local_prediction["confidence_score"], cloud_result.confidence_score), 4)
                verdict_status = "INCONCLUSIVE"
            else:
                predicted_label = cloud_label
                predicted_class_id = local_prediction["predicted_class_id"]
                confidence_score = round((local_prediction["confidence_score"] + cloud_result.confidence_score) / 2.0, 4)
                verdict_status = "CONFIDENT"

            model_info = {
                **local_prediction["model_info"],
                "cloud_provider": cloud_result.provider,
                "cloud_status": cloud_result.status,
                "cloud_model_id": cloud_result.model_id,
                "fallback_used": False
            }
        else:
            # Fallback to local prediction
            predicted_label = local_prediction["predicted_label"]
            predicted_class_id = local_prediction["predicted_class_id"]
            confidence_score = local_prediction["confidence_score"]
            verdict_status = local_prediction.get("verdict_status", "CONFIDENT")

            model_info = {
                **local_prediction["model_info"],
                "cloud_provider": "huggingface" if config.cloud_inference_enabled else None,
                "cloud_status": cloud_result.status,
                "cloud_model_id": config.primary_cloud_model if config.cloud_inference_enabled else None,
                "fallback_used": True
            }

        return ImageAnalysisResponse(
            success=True,
            filename=file.filename or "uploaded_media.jpg",
            sha256=sha256_hash,
            file_size_bytes=len(raw_bytes),
            image_dimensions=dimensions_str,
            device_used=local_prediction["device_used"],
            inference_time_ms=local_prediction["inference_time_ms"],
            predicted_label=predicted_label,
            predicted_class_id=predicted_class_id,
            confidence_score=confidence_score,
            verdict_status=verdict_status,
            scores=local_prediction["scores"],
            model_info=model_info,
            forensic_caveat=local_prediction["forensic_caveat"]
        )

    except Exception as e:
        logger.error(f"Inference error during image analysis: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference pipeline execution error: {str(e)}"
        )


@app.post("/api/v1/analyze/video", response_model=VideoAnalysisResponse)
async def analyze_video(
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Accepts an uploaded video file, validates structure and size limits,
    extracts representative keyframes using OpenCV, and executes multi-keyframe
    spatial deepfake classification using the PyTorch SigLIP model on GPU.
    """
    try:
        return await process_and_analyze_video(file)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during video analysis: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Video analysis execution error: {str(e)}"
        )


@app.post("/api/v1/analyze/audio", response_model=AudioAnalysisResponse)
async def analyze_audio(
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Accepts an uploaded audio file (WAV, MP3, etc.), validates duration and size,
    and executes neural deepfake & synthetic voice classification using Wav2Vec2 on GPU/CPU.
    """
    try:
        return await process_and_analyze_audio(file)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during audio analysis: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Audio analysis execution error: {str(e)}"
        )



