import time
import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
import httpx

from app.config import config

logger = logging.getLogger("deepfake_ai.cloud_provider")

DEFAULT_TIMEOUT_SECONDS = 10.0


@dataclass
class CloudInferenceResult:
    """Structured, safe result from cloud-hosted inference."""
    success: bool
    predicted_label: Optional[str] = None  # "Fake", "Real", or "Inconclusive"
    confidence_score: float = 0.0
    fake_probability: float = 0.0
    real_probability: float = 0.0
    raw_scores: List[Dict[str, Any]] = field(default_factory=list)
    latency_ms: float = 0.0
    provider: str = "huggingface"
    model_id: str = "umm-maybe/AI-image-detector"
    status: str = "INITIALIZED"  # "SUCCESS", "PAYMENT_REQUIRED", "UNAUTHORIZED", "RATE_LIMITED", "TIMEOUT", "DISABLED", "ERROR"
    error_message: Optional[str] = None
    fallback_used: bool = False


class CloudInferenceService:
    """
    Server-side Cloud Inference Adapter for Hugging Face Hosted Inference.
    - Strictly hides credentials behind backend environment configuration.
    - Implements non-blocking async requests with strict timeouts.
    - Normalizes disparate vendor labels ('artificial' -> 'Fake', 'human' -> 'Real').
    - Implements graceful fallback: never crashes FastAPI if cloud provider is unavailable.
    """
    _instance: Optional["CloudInferenceService"] = None

    def __init__(self):
        self.model_id = config.primary_cloud_model
        self.router_url = f"{config.hf_inference_router_url}/{self.model_id}"
        self.timeout = DEFAULT_TIMEOUT_SECONDS

    @classmethod
    def get_instance(cls) -> "CloudInferenceService":
        if cls._instance is None:
            cls._instance = CloudInferenceService()
        return cls._instance

    async def predict_image(self, image_bytes: bytes) -> CloudInferenceResult:
        """
        Executes cloud-hosted image classification.
        Returns CloudInferenceResult without throwing uncaught exceptions.
        """
        if not config.is_cloud_inference_active:
            return CloudInferenceResult(
                success=False,
                provider="huggingface",
                model_id=self.model_id,
                status="DISABLED" if not config.cloud_inference_enabled else "NO_TOKEN",
                error_message="Cloud inference is disabled or HF_TOKEN is not configured in backend/.env.",
                fallback_used=True
            )

        start_time = time.perf_counter()

        headers = {
            "Authorization": f"Bearer {config.hf_token}",
            "Content-Type": "image/jpeg"
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    self.router_url,
                    headers=headers,
                    content=image_bytes
                )

            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

            if response.status_code == 200:
                data = response.json()
                return self._parse_huggingface_response(data, latency_ms)

            elif response.status_code == 401:
                logger.warning("Cloud inference rejected: 401 Unauthorized (Invalid or expired HF_TOKEN).")
                return CloudInferenceResult(
                    success=False,
                    latency_ms=latency_ms,
                    status="UNAUTHORIZED",
                    error_message="Hugging Face API rejected authentication. Verify HF_TOKEN permissions.",
                    fallback_used=True
                )

            elif response.status_code == 402:
                logger.warning("Cloud inference rejected: 402 Payment Required (Pre-paid credits or PRO subscription required).")
                return CloudInferenceResult(
                    success=False,
                    latency_ms=latency_ms,
                    status="PAYMENT_REQUIRED",
                    error_message="Hugging Face router requires pre-paid credits or PRO subscription for this endpoint.",
                    fallback_used=True
                )

            elif response.status_code == 429:
                logger.warning("Cloud inference rate-limited: 429 Too Many Requests.")
                return CloudInferenceResult(
                    success=False,
                    latency_ms=latency_ms,
                    status="RATE_LIMITED",
                    error_message="Hugging Face serverless rate limit exceeded.",
                    fallback_used=True
                )

            elif response.status_code == 503:
                logger.info("Cloud model is currently cold/loading (503 Service Unavailable).")
                return CloudInferenceResult(
                    success=False,
                    latency_ms=latency_ms,
                    status="MODEL_LOADING",
                    error_message="Cloud model is loading into GPU memory on Hugging Face infrastructure.",
                    fallback_used=True
                )

            else:
                logger.warning(f"Cloud inference returned HTTP {response.status_code}: {response.text[:200]}")
                return CloudInferenceResult(
                    success=False,
                    latency_ms=latency_ms,
                    status=f"HTTP_{response.status_code}",
                    error_message=f"Cloud provider returned status {response.status_code}.",
                    fallback_used=True
                )

        except httpx.TimeoutException:
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.warning(f"Cloud inference timed out after {self.timeout}s.")
            return CloudInferenceResult(
                success=False,
                latency_ms=latency_ms,
                status="TIMEOUT",
                error_message=f"Cloud provider connection timed out after {self.timeout}s.",
                fallback_used=True
            )

        except Exception as e:
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(f"Cloud inference request error: {str(e)}", exc_info=False)
            return CloudInferenceResult(
                success=False,
                latency_ms=latency_ms,
                status="NETWORK_ERROR",
                error_message="Failed to establish connection with cloud inference provider.",
                fallback_used=True
            )

    def _parse_huggingface_response(self, data: Any, latency_ms: float) -> CloudInferenceResult:
        """
        Normalizes Hugging Face pipeline output:
        [{"label": "artificial", "score": 0.94}, {"label": "human", "score": 0.06}]
        or [[{"label": ...}]]
        """
        if not isinstance(data, list) or not data:
            return CloudInferenceResult(
                success=False,
                latency_ms=latency_ms,
                status="MALFORMED_RESPONSE",
                error_message="Unexpected response format from Hugging Face endpoint.",
                fallback_used=True
            )

        items = data[0] if isinstance(data[0], list) else data

        fake_prob = 0.0
        real_prob = 0.0
        raw_scores: List[Dict[str, Any]] = []

        for item in items:
            if not isinstance(item, dict):
                continue
            lbl = str(item.get("label", "")).lower()
            score = float(item.get("score", 0.0))

            # Normalize labels: artificial/fake -> Fake, human/real -> Real
            if "artif" in lbl or "fake" in lbl or "synthetic" in lbl or "gen" in lbl:
                fake_prob = score
                norm_label = "Fake"
            elif "human" in lbl or "real" in lbl or "authentic" in lbl:
                real_prob = score
                norm_label = "Real"
            else:
                norm_label = lbl.capitalize()

            raw_scores.append({
                "label": norm_label,
                "raw_label": lbl,
                "probability": round(score, 4),
                "percentage": round(score * 100, 2)
            })

        # Uncertainty band calibration: 0.45 to 0.65 -> Inconclusive
        if 0.45 <= fake_prob <= 0.65:
            predicted_label = "Inconclusive"
            confidence_score = round(max(fake_prob, real_prob), 4)
        elif fake_prob > 0.65:
            predicted_label = "Fake"
            confidence_score = round(fake_prob, 4)
        else:
            predicted_label = "Real"
            confidence_score = round(real_prob, 4)

        return CloudInferenceResult(
            success=True,
            predicted_label=predicted_label,
            confidence_score=confidence_score,
            fake_probability=round(fake_prob, 4),
            real_probability=round(real_prob, 4),
            raw_scores=raw_scores,
            latency_ms=latency_ms,
            provider="huggingface",
            model_id=self.model_id,
            status="SUCCESS",
            error_message=None,
            fallback_used=False
        )
