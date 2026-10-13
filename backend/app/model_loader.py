import logging
import time
from typing import Dict, Any, Optional, List
from PIL import Image

logger = logging.getLogger("deepfake_ai.model_loader")

BASELINE_MODEL_ID = "king1oo1/deepfake-model"
CANDIDATE_MODEL_ID = "prithivMLmods/Deep-Fake-Detector-v2-Model"

# Empirically validated decision thresholds from 50-sample disjoint holdout validation
CANDIDATE_LOWER_THRESHOLD = 0.70  # Below this -> Likely Authentic (Real)
CANDIDATE_UPPER_THRESHOLD = 0.76  # Above this -> Highly Confident Deepfake (Fake)
# Between 0.70 and 0.76 -> INCONCLUSIVE (Ambiguous Forensic Evidence)


class DeepfakeDetectorService:
    """
    Service managing image deepfake detection models.
    Supports dual-model architecture:
    - Primary Candidate: prithivMLmods/Deep-Fake-Detector-v2-Model (ViT, calibrated threshold & inconclusive margin)
    - Baseline Production / Fallback: king1oo1/deepfake-model (SigLIP)
    Provides automatic, transparent fallback if the candidate engine fails.
    """
    _instance: Optional["DeepfakeDetectorService"] = None

    def __init__(self):
        self.model_id = BASELINE_MODEL_ID
        self.candidate_model_id = CANDIDATE_MODEL_ID
        self.device = "cpu"
        self.gpu_name: Optional[str] = None

        # Baseline model references
        self.processor = None
        self.model = None
        self.is_ready = False
        self.load_error: Optional[str] = None
        self.id2label: Dict[int, str] = {0: "Real", 1: "Fake"}
        self.num_parameters = 92_885_762

        # Candidate model references
        self.candidate_processor = None
        self.candidate_model = None
        self.candidate_ready = False
        self.candidate_load_error: Optional[str] = None
        self.candidate_id2label: Dict[int, str] = {0: "Realism", 1: "Deepfake"}
        self.candidate_parameters = 85_800_000
        self.candidate_fake_idx = 1
        self.candidate_real_idx = 0

    @classmethod
    def get_instance(cls) -> "DeepfakeDetectorService":
        if cls._instance is None:
            cls._instance = DeepfakeDetectorService()
        return cls._instance

    def initialize(self) -> bool:
        """
        Loads the baseline model and candidate model onto the target device (CUDA or CPU).
        """
        try:
            import torch
            from transformers import AutoImageProcessor, AutoModelForImageClassification

            # 1. Device Selection
            if torch.cuda.is_available():
                self.device = "cuda"
                try:
                    self.gpu_name = torch.cuda.get_device_name(0)
                except Exception:
                    self.gpu_name = "NVIDIA CUDA Device"
                logger.info(f"Targeting GPU: {self.gpu_name} (device='cuda')")
            else:
                self.device = "cpu"
                self.gpu_name = None
                logger.info("Targeting CPU (CUDA unavailable)")

            # 2. Load Baseline Model (Preserved)
            logger.info(f"Loading baseline image model: {self.model_id}...")
            self.processor = AutoImageProcessor.from_pretrained(self.model_id)
            self.model = AutoModelForImageClassification.from_pretrained(self.model_id)
            self.model.to(self.device)
            self.model.eval()

            if hasattr(self.model.config, "id2label") and self.model.config.id2label:
                self.id2label = {int(k): str(v) for k, v in self.model.config.id2label.items()}

            self.is_ready = True
            self.load_error = None
            logger.info(f"Baseline detector ({self.model_id}) loaded successfully on {self.device}.")

            # 3. Load Candidate Model (prithivMLmods/Deep-Fake-Detector-v2-Model)
            try:
                logger.info(f"Loading candidate image model: {self.candidate_model_id}...")
                self.candidate_processor = AutoImageProcessor.from_pretrained(self.candidate_model_id)
                self.candidate_model = AutoModelForImageClassification.from_pretrained(self.candidate_model_id)
                self.candidate_model.to(self.device)
                self.candidate_model.eval()

                if hasattr(self.candidate_model.config, "id2label") and self.candidate_model.config.id2label:
                    self.candidate_id2label = {int(k): str(v) for k, v in self.candidate_model.config.id2label.items()}
                    for k, v in self.candidate_id2label.items():
                        v_lower = v.lower()
                        if "fake" in v_lower or "deepfake" in v_lower:
                            self.candidate_fake_idx = k
                        elif "real" in v_lower or "realism" in v_lower:
                            self.candidate_real_idx = k

                self.candidate_ready = True
                self.candidate_load_error = None
                logger.info(f"Candidate detector ({self.candidate_model_id}) loaded successfully on {self.device}.")
            except Exception as cand_err:
                self.candidate_ready = False
                self.candidate_load_error = str(cand_err)
                logger.warning(
                    f"Candidate model ({self.candidate_model_id}) failed to load. Will fall back to baseline: {cand_err}"
                )

            return True

        except Exception as e:
            self.is_ready = False
            self.load_error = str(e)
            logger.error(f"Failed to load baseline model {self.model_id}: {str(e)}", exc_info=True)
            return False

    def predict(self, image: Image.Image, use_candidate: bool = True) -> Dict[str, Any]:
        """
        Executes deepfake classification on an RGB PIL Image.
        Tries candidate model with validated calibrated thresholds and inconclusive band.
        Falls back safely to baseline model if candidate is not ready or encounters a runtime error.
        """
        if not self.is_ready or self.model is None or self.processor is None:
            raise RuntimeError(
                f"Baseline model is not ready for inference. Status: {self.load_error or 'Not initialized'}"
            )

        import torch

        # Attempt Candidate Model Inference
        if use_candidate and self.candidate_ready and self.candidate_model is not None and self.candidate_processor is not None:
            try:
                start_time = time.perf_counter()
                inputs = self.candidate_processor(images=image, return_tensors="pt")
                inputs = {k: v.to(self.device) for k, v in inputs.items()}

                with torch.inference_mode():
                    outputs = self.candidate_model(**inputs)
                    logits = outputs.logits.squeeze(0)
                    probabilities = torch.softmax(logits, dim=-1)

                if self.device == "cuda":
                    torch.cuda.synchronize()

                inference_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

                p_fake = float(probabilities[self.candidate_fake_idx].item())
                p_real = float(probabilities[self.candidate_real_idx].item())
                logit_fake = float(logits[self.candidate_fake_idx].item())
                logit_real = float(logits[self.candidate_real_idx].item())

                # Calibrated decision threshold with Inconclusive margin
                if p_fake > CANDIDATE_UPPER_THRESHOLD:
                    predicted_label = "Fake"
                    pred_class_id = self.candidate_fake_idx
                    confidence_score = round(p_fake, 4)
                    verdict_status = "CONFIDENT"
                elif p_fake < CANDIDATE_LOWER_THRESHOLD:
                    predicted_label = "Real"
                    pred_class_id = self.candidate_real_idx
                    confidence_score = round(p_real, 4)
                    verdict_status = "CONFIDENT"
                else:
                    predicted_label = "Inconclusive"
                    pred_class_id = -1
                    confidence_score = round(max(p_fake, p_real), 4)
                    verdict_status = "INCONCLUSIVE"

                scores = [
                    {
                        "label": "Real",
                        "raw_logit": round(logit_real, 4),
                        "probability": round(p_real, 4),
                        "percentage": round(p_real * 100, 2)
                    },
                    {
                        "label": "Fake",
                        "raw_logit": round(logit_fake, 4),
                        "probability": round(p_fake, 4),
                        "percentage": round(p_fake * 100, 2)
                    }
                ]

                caveat = (
                    "Classification generated via candidate model (ViT) with calibrated decision thresholds. "
                    "Softmax scores reflect empirical class activations rather than calibrated probabilities. "
                    "Samples with activation scores within the ambiguous margin (0.70 - 0.76) are classified as INCONCLUSIVE."
                )

                return {
                    "predicted_label": predicted_label,
                    "predicted_class_id": pred_class_id,
                    "confidence_score": confidence_score,
                    "verdict_status": verdict_status,
                    "device_used": self.device,
                    "inference_time_ms": inference_time_ms,
                    "scores": scores,
                    "model_info": {
                        "model_id": self.candidate_model_id,
                        "architecture": "ViTForImageClassification (Candidate with Threshold Calibration)",
                        "base_backbone": "google/vit-base-patch16-224-in21k",
                        "num_parameters": self.candidate_parameters,
                        "license": "Apache-2.0",
                        "active_engine": "candidate",
                        "fallback_used": False
                    },
                    "forensic_caveat": caveat
                }

            except Exception as cand_run_err:
                logger.error(
                    f"Candidate model inference encountered error: {cand_run_err}. Falling back to baseline model...",
                    exc_info=True
                )

        # Baseline Fallback Inference
        start_time = time.perf_counter()
        inputs = self.processor(images=image, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.inference_mode():
            outputs = self.model(**inputs)
            logits = outputs.logits.squeeze(0)
            probabilities = torch.softmax(logits, dim=-1)

        if self.device == "cuda":
            torch.cuda.synchronize()

        inference_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

        pred_class_id = int(torch.argmax(probabilities).item())
        predicted_label = self.id2label.get(pred_class_id, "Unknown")
        confidence_score = float(probabilities[pred_class_id].item())

        scores = []
        for class_id, prob_tensor in enumerate(probabilities):
            label_name = self.id2label.get(class_id, f"Class_{class_id}")
            prob_val = float(prob_tensor.item())
            raw_logit = float(logits[class_id].item())
            scores.append({
                "label": label_name,
                "raw_logit": round(raw_logit, 4),
                "probability": round(prob_val, 4),
                "percentage": round(prob_val * 100, 2)
            })

        return {
            "predicted_label": predicted_label,
            "predicted_class_id": pred_class_id,
            "confidence_score": round(confidence_score, 4),
            "verdict_status": "CONFIDENT",
            "device_used": self.device,
            "inference_time_ms": inference_time_ms,
            "scores": scores,
            "model_info": {
                "model_id": self.model_id,
                "architecture": "SiglipForImageClassification (Baseline Production Fallback)",
                "base_backbone": "google/siglip2-base-patch16-224",
                "num_parameters": self.num_parameters,
                "license": "Apache-2.0",
                "active_engine": "baseline_fallback",
                "fallback_used": True
            },
            "forensic_caveat": (
                "Executed on baseline fallback detector (SigLIP). Softmax scores represent uncalibrated "
                "class activations and should be corroborated with Error Level Analysis (ELA) and provenance hashes."
            )
        }
