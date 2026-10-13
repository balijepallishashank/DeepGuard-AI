import os
import json
import time
import torch
import soundfile as sf
import numpy as np
from scipy.signal import resample_poly
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification

EVAL_ROOT = os.path.abspath("evaluation_dataset")
MANIFEST_PATH = os.path.join(EVAL_ROOT, "manifest.json")

def evaluate_audio_candidate(model_id):
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    aud_records = [r for r in manifest["records"] if r["modality"] == "audio"]
    print(f"\nEvaluating candidate audio model: {model_id}...")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    try:
        extractor = AutoFeatureExtractor.from_pretrained(model_id)
        model = AutoModelForAudioClassification.from_pretrained(model_id).to(device)
        model.eval()
    except Exception as e:
        print(f"Failed to load {model_id}: {e}")
        return

    print("Config id2label:", model.config.id2label)
    fake_idx = None
    real_idx = None
    for idx, lbl in model.config.id2label.items():
        lbl_lower = lbl.lower()
        if any(w in lbl_lower for w in ["fake", "spoof", "synthetic"]):
            fake_idx = int(idx)
        elif any(w in lbl_lower for w in ["real", "bonafide", "genuine", "human"]):
            real_idx = int(idx)

    print(f"Mapped fake_idx={fake_idx}, real_idx={real_idx}")

    y_true = []
    y_pred = []
    p_fakes = []
    latencies = []

    for r in aud_records:
        fp = os.path.join(EVAL_ROOT, r["filename"])
        gt = r["ground_truth"]

        data, sr = sf.read(fp, dtype="float32")
        if data.ndim > 1:
            data = np.mean(data, axis=1)
        gcd = np.gcd(sr, 16000)
        wav_16k = resample_poly(data.astype(np.float32), 16000 // gcd, sr // gcd)

        t0 = time.perf_counter()
        inputs = extractor(wav_16k, sampling_rate=16000, return_tensors="pt", padding=True)
        inputs = {k: v.to(device) for k, v in inputs.items()}
        with torch.no_grad():
            logits = model(**inputs).logits
            sm = torch.softmax(logits, dim=-1).squeeze().cpu().numpy()
        lat = (time.perf_counter() - t0) * 1000
        latencies.append(lat)

        p_fake = float(sm[fake_idx]) if fake_idx is not None else float(sm[1])
        p_real = float(sm[real_idx]) if real_idx is not None else float(sm[0])
        pred_lbl = "Fake" if p_fake > 0.50 else "Real"

        y_true.append(gt)
        y_pred.append(pred_lbl)
        p_fakes.append((r["filename"], gt, p_fake))

    tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "Fake" and yp == "Fake")
    fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "Real" and yp == "Fake")
    tn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "Real" and yp == "Real")
    fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "Fake" and yp == "Real")

    tot = tp + fp + tn + fn
    acc = (tp + tn) / tot if tot > 0 else 0
    prec = tp / (tp + fp) if (tp + fp) > 0 else 0
    rec = tp / (tp + fn) if (tp + fn) > 0 else 0
    spec = tn / (tn + fp) if (tn + fp) > 0 else 0
    bal = 0.5 * (rec + spec)
    f1 = 2 * prec * rec / (prec + rec) if (prec + rec) > 0 else 0

    print("=" * 60)
    print(f"RESULTS FOR: {model_id}")
    print(f"TP={tp}, FP={fp}, TN={tn}, FN={fn}")
    print(f"Accuracy: {acc*100:.2f}% | Balanced Accuracy: {bal*100:.2f}%")
    print(f"Precision: {prec*100:.2f}% | Recall: {rec*100:.2f}% | Specificity: {spec*100:.2f}%")
    print(f"F1-Score: {f1*100:.2f}% | Mean Latency: {np.mean(latencies):.2f} ms")

    real_p = [p[2] for p in p_fakes if p[1] == "Real"]
    fake_p = [p[2] for p in p_fakes if p[1] == "Fake"]
    print(f"Real P_Fake distribution: min={np.min(real_p):.4f}, max={np.max(real_p):.4f}, mean={np.mean(real_p):.4f}")
    print(f"Fake P_Fake distribution: min={np.min(fake_p):.4f}, max={np.max(fake_p):.4f}, mean={np.mean(fake_p):.4f}")

if __name__ == "__main__":
    for mid in [
        "garystafford/wav2vec2-deepfake-voice-detector",
        "abhishtagatya/wav2vec2-base-960h-itw-deepfake"
    ]:
        evaluate_audio_candidate(mid)
