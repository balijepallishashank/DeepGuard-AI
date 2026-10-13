import logging
import time
from typing import Dict, Any, Optional, List
import numpy as np

logger = logging.getLogger("deepfake_ai.audio_model_loader")

AUDIO_MODEL_ID = "MelodyMachine/Deepfake-audio-detection-V2"


class AudioDeepfakeDetectorService:
    """
    Singleton service managing the Wav2Vec2 Audio Deepfake Detection model.
    Loads pretrained weights into GPU (CUDA) or CPU memory.
    """
    _instance: Optional["AudioDeepfakeDetectorService"] = None

    def __init__(self):
        self.model_id = AUDIO_MODEL_ID
        self.device = "cpu"
        self.gpu_name: Optional[str] = None
        self.feature_extractor = None
        self.model = None
        self.is_ready = False
        self.load_error: Optional[str] = None
        self.id2label: Dict[int, str] = {0: "Fake", 1: "Real"}
        self.num_parameters = 94_396_418

    @classmethod
    def get_instance(cls) -> "AudioDeepfakeDetectorService":
        if cls._instance is None:
            cls._instance = AudioDeepfakeDetectorService()
        return cls._instance

    def initialize(self) -> bool:
        """
        Loads the Wav2Vec2 feature extractor and audio classification model.
        """
        try:
            import torch
            from transformers import AutoFeatureExtractor, AutoModelForAudioClassification

            if torch.cuda.is_available():
                self.device = "cuda"
                try:
                    self.gpu_name = torch.cuda.get_device_name(0)
                except Exception:
                    self.gpu_name = "NVIDIA CUDA Device"
                logger.info(f"Targeting GPU for audio model: {self.gpu_name} (device='cuda')")
            else:
                self.device = "cpu"
                self.gpu_name = None
                logger.info("Targeting CPU for audio model (CUDA unavailable)")

            logger.info(f"Loading audio feature extractor for {self.model_id}...")
            self.feature_extractor = AutoFeatureExtractor.from_pretrained(self.model_id)

            logger.info(f"Loading audio model weights for {self.model_id}...")
            self.model = AutoModelForAudioClassification.from_pretrained(self.model_id)

            self.model.to(self.device)
            self.model.eval()

            # Normalize label mapping to Title Case ("Fake", "Real")
            if hasattr(self.model.config, "id2label") and self.model.config.id2label:
                raw_map = self.model.config.id2label
                self.id2label = {}
                for k, v in raw_map.items():
                    val_str = str(v).lower()
                    if "fake" in val_str or "spoof" in val_str:
                        self.id2label[int(k)] = "Fake"
                    elif "real" in val_str or "bonafide" in val_str:
                        self.id2label[int(k)] = "Real"
                    else:
                        self.id2label[int(k)] = str(v).capitalize()

            self.is_ready = True
            self.load_error = None
            logger.info(f"Audio deepfake detector loaded successfully on {self.device}. Labels: {self.id2label}")
            return True

        except Exception as e:
            self.is_ready = False
            self.load_error = str(e)
            logger.error(f"Failed to load audio model {self.model_id}: {str(e)}", exc_info=True)
            return False

    def predict(self, waveform: np.ndarray, sample_rate: int = 16000) -> Dict[str, Any]:
        """
        Executes genuine audio deepfake classification on a 1D float32 numpy waveform.
        """
        if not self.is_ready or self.model is None or self.feature_extractor is None:
            raise RuntimeError(
                f"Audio model is not ready for inference. Status: {self.load_error or 'Not initialized'}"
            )

        import torch

        start_time = time.perf_counter()

        # Preprocess waveform
        inputs = self.feature_extractor(
            waveform,
            sampling_rate=sample_rate,
            return_tensors="pt"
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.inference_mode():
            outputs = self.model(**inputs)
            logits = outputs.logits.squeeze(0)  # Shape: [2]
            probabilities = torch.softmax(logits, dim=-1)

        if self.device == "cuda":
            torch.cuda.synchronize()

        inference_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

        pred_class_id = int(torch.argmax(probabilities).item())
        confidence_score = float(probabilities[pred_class_id].item())

        scores = []
        fake_prob = 0.0
        for class_id, prob_tensor in enumerate(probabilities):
            label_name = self.id2label.get(class_id, f"Class_{class_id}")
            prob_val = float(prob_tensor.item())
            raw_logit = float(logits[class_id].item())
            if label_name == "Fake":
                fake_prob = prob_val
            scores.append({
                "label": label_name,
                "raw_logit": round(raw_logit, 4),
                "probability": round(prob_val, 4),
                "percentage": round(prob_val * 100, 2)
            })

        # Apply inconclusive band when evidence is ambiguous (40% to 60%)
        if 0.40 <= fake_prob <= 0.60:
            predicted_label = "Inconclusive"
            pred_class_id = -1
            verdict_status = "INCONCLUSIVE"
        elif fake_prob > 0.60:
            predicted_label = "Fake"
            verdict_status = "CONFIDENT"
        else:
            predicted_label = "Real"
            verdict_status = "CONFIDENT"

        return {
            "predicted_label": predicted_label,
            "predicted_class_id": pred_class_id,
            "confidence_score": round(confidence_score, 4),
            "verdict_status": verdict_status,
            "fake_probability_percentage": round(fake_prob * 100, 2),
            "device_used": self.device,
            "inference_time_ms": inference_time_ms,
            "scores": scores,
            "model_info": {
                "model_id": self.model_id,
                "architecture": "Wav2Vec2ForSequenceClassification",
                "base_backbone": "facebook/wav2vec2-base",
                "num_parameters": self.num_parameters,
                "license": "Apache-2.0"
            },
            "forensic_caveat": (
                "Acoustic classification is an empirical prediction from Wav2Vec2 representations. "
                "Softmax scores are class activations, NOT calibrated mathematical probabilities. "
                "A 'Real' prediction indicates no synthetic vocoder artifacts detected above threshold; "
                "it does NOT constitute verified proof of authentic human origin. Ambiguous scores (40-60%) are marked INCONCLUSIVE."
            )
        }

    def predict_segments(
        self,
        waveform: np.ndarray,
        sample_rate: int = 16000,
        segment_duration_sec: float = 3.0,
        hop_sec: float = 2.0
    ) -> List[Dict[str, Any]]:
        """
        Executes sliding-window classification across an audio clip to detect localized deepfake segments.
        """
        if not self.is_ready or self.model is None or self.feature_extractor is None:
            return []

        import torch

        total_samples = len(waveform)
        total_duration = total_samples / sample_rate

        # If clip is short, return a single segment
        if total_duration <= segment_duration_sec:
            res = self.predict(waveform, sample_rate)
            return [{
                "segment_index": 0,
                "start_time_sec": 0.0,
                "end_time_sec": round(total_duration, 2),
                "timestamp_str": f"00:00 - {int(total_duration // 60):02d}:{int(total_duration % 60):02d}",
                "predicted_label": res["predicted_label"],
                "confidence_score": res["confidence_score"],
                "fake_probability_percentage": res["fake_probability_percentage"],
                "scores": res["scores"]
            }]

        seg_samples = int(segment_duration_sec * sample_rate)
        hop_samples = int(hop_sec * sample_rate)
        segments = []
        idx = 0

        for start in range(0, total_samples - int(0.5 * sample_rate), hop_samples):
            end = min(start + seg_samples, total_samples)
            chunk = waveform[start:end]
            if len(chunk) < int(0.5 * sample_rate):
                break

            # Infer on chunk
            inputs = self.feature_extractor(
                chunk,
                sampling_rate=sample_rate,
                return_tensors="pt"
            )
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            with torch.inference_mode():
                outputs = self.model(**inputs)
                logits = outputs.logits.squeeze(0)
                probabilities = torch.softmax(logits, dim=-1)

            chunk_scores = []
            chunk_fake_prob = 0.0
            for class_id, prob_tensor in enumerate(probabilities):
                label_name = self.id2label.get(class_id, f"Class_{class_id}")
                prob_val = float(prob_tensor.item())
                raw_logit = float(logits[class_id].item())
                if label_name == "Fake":
                    chunk_fake_prob = prob_val
                chunk_scores.append({
                    "label": label_name,
                    "raw_logit": round(raw_logit, 4),
                    "probability": round(prob_val, 4),
                    "percentage": round(prob_val * 100, 2)
                })

            confidence_score = float(torch.max(probabilities).item())
            if 0.40 <= chunk_fake_prob <= 0.60:
                predicted_label = "Inconclusive"
            elif chunk_fake_prob > 0.60:
                predicted_label = "Fake"
            else:
                predicted_label = "Real"

            start_sec = start / sample_rate
            end_sec = end / sample_rate
            start_m, start_s = int(start_sec // 60), int(start_sec % 60)
            end_m, end_s = int(end_sec // 60), int(end_sec % 60)
            timestamp_str = f"{start_m:02d}:{start_s:02d} - {end_m:02d}:{end_s:02d}"

            segments.append({
                "segment_index": idx,
                "start_time_sec": round(start_sec, 2),
                "end_time_sec": round(end_sec, 2),
                "timestamp_str": timestamp_str,
                "predicted_label": predicted_label,
                "confidence_score": round(confidence_score, 4),
                "fake_probability_percentage": round(chunk_fake_prob * 100, 2),
                "scores": chunk_scores
            })
            idx += 1

        if self.device == "cuda":
            torch.cuda.synchronize()

        return segments
