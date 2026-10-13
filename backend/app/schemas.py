from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(..., description="Overall service status (e.g. 'ok', 'degraded')")
    api_version: str = Field("1.1.0", description="Backend API version")
    model_ready: bool = Field(..., description="True if PyTorch model is loaded and ready for inference")
    model_name: str = Field(..., description="Hugging Face model repository ID")
    audio_model_ready: Optional[bool] = Field(None, description="True if PyTorch audio model is loaded")
    audio_model_name: Optional[str] = Field(None, description="Hugging Face audio model repository ID")
    device: str = Field(..., description="Inference device used (cuda or cpu)")
    gpu_name: Optional[str] = Field(None, description="Name of GPU device if CUDA is active")
    details: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Diagnostic telemetry")


class PredictionClassScore(BaseModel):
    label: str = Field(..., description="Predicted class name ('Real', 'Fake', or 'Inconclusive')")
    raw_logit: float = Field(..., description="Raw unnormalized logit score directly from model output")
    probability: float = Field(..., description="Softmax-normalized score (0.0 to 1.0; class activation level, not mathematical probability)")
    percentage: float = Field(..., description="Percentage format (0.0% to 100.0%)")


class ModelInformation(BaseModel):
    model_id: str
    architecture: str
    base_backbone: str
    num_parameters: int
    license: str
    active_engine: Optional[str] = "candidate"
    fallback_used: Optional[bool] = False
    cloud_provider: Optional[str] = None
    cloud_status: Optional[str] = None
    cloud_model_id: Optional[str] = None


class ImageAnalysisResponse(BaseModel):
    success: bool
    filename: str
    sha256: str
    file_size_bytes: int
    image_dimensions: str
    device_used: str
    inference_time_ms: float
    predicted_label: str = Field(..., description="Classification verdict: 'Real', 'Fake', or 'Inconclusive'")
    predicted_class_id: int
    confidence_score: float
    verdict_status: Optional[str] = Field("CONFIDENT", description="'CONFIDENT' or 'INCONCLUSIVE' based on decision margins")
    scores: List[PredictionClassScore]
    model_info: ModelInformation
    forensic_caveat: str


class FrameAnalysisResult(BaseModel):
    frame_index: int
    timestamp_sec: float
    timestamp_str: str
    predicted_label: str
    predicted_class_id: int
    confidence_score: float
    scores: List[PredictionClassScore]


class VideoAnalysisResponse(BaseModel):
    success: bool
    filename: str
    sha256: str
    file_size_bytes: int
    duration_seconds: float
    fps: float
    total_frames_in_video: int
    sampled_frames_count: int
    video_classification: str = Field(..., description="Classification: 'Likely AI-Generated Video', 'Likely Authentic Video', or 'Inconclusive / Ambiguous Video Evidence'")
    overall_confidence: float
    fake_probability_percentage: float
    suspicious_frames_count: int
    device_used: str
    inference_time_ms: float
    analysis_type: Optional[str] = Field("Frame-Sampled Spatial Keyframe Analysis", description="Exploratory frame-based detection method")
    methodology_disclaimer: Optional[str] = Field(
        "Analyzes static keyframe samples independently; lacks validated 3D temporal spatiotemporal detection.",
        description="Explicit video detection limitation"
    )
    frame_results: List[FrameAnalysisResult]
    model_info: ModelInformation
    forensic_caveat: str


class AudioSegmentResult(BaseModel):
    segment_index: int
    start_time_sec: float
    end_time_sec: float
    timestamp_str: str
    predicted_label: str
    confidence_score: float
    fake_probability_percentage: float
    scores: List[PredictionClassScore]


class AudioAnalysisResponse(BaseModel):
    success: bool
    filename: str
    sha256: str
    file_size_bytes: int
    duration_seconds: float
    sample_rate: int
    channels: int
    device_used: str
    inference_time_ms: float
    predicted_label: str = Field(..., description="Classification: 'Real', 'Fake', or 'Inconclusive'")
    predicted_class_id: int
    confidence_score: float
    fake_probability_percentage: float
    spectral_anomaly_score: float
    acoustic_index_label: Optional[str] = Field("Exploratory Spectral Anomaly Index", description="Clarification of spectral index measurement")
    authenticity_caveat: Optional[str] = Field(
        "A 'Real' verdict indicates no synthetic vocoder or voice-clone signatures detected above threshold; it does NOT constitute verified proof of authentic human origin.",
        description="Explicit audio authenticity caveat"
    )
    scores: List[PredictionClassScore]
    segments: List[AudioSegmentResult]
    model_info: ModelInformation
    forensic_caveat: str

