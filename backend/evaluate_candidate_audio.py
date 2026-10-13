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

def evaluate_hypermoon():
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    aud_records = [r for r in manifest["records"] if r["modality"] == "audio"]
    print(f"Evaluating {len(aud_records)} audio records with HyperMoon...")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model_id = "HyperMoon/wav2vec2-base-960h-finetuned-deepfake"
    feature_extractor = AutoFeatureExtractor.from_pretrained(model_id)
    model = AutoModelForAudioClassification.from_pretrained(model_id).to(device)
    model.eval()

    y_true = []
    y_pred = []
    probs = []
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
        inputs = feature_extractor(wav_16k, sampling_rate=16000, return_tensors="pt", padding=True)
        inputs = {k: v.to(device) for k, v in inputs.items()}
        with torch.no_grad():
            logits = model(**inputs).logits
            sm = torch.softmax(logits, dim=-1).squeeze().cpu().numpy()
        lat = (time.perf_counter() - t0) * 1000
        latencies.append(lat)
        
        p_bonafide = float(sm[0])
        p_spoof = float(sm[1])
        pred_lbl = "Fake" if p_spoof > 0.50 else "Real"
        y_true.append(gt)
        y_pred.append(pred_lbl)
        probs.append({"file": r["filename"], "gt": gt, "p_real": p_bonafide, "p_fake": p_spoof, "pred": pred_lbl})

    tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "Fake" and yp == "Fake")
    fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "Real" and yp == "Fake")
    tn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "Real" and yp == "Real")
    fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "Fake" and yp == "Real")

    total = tp + fp + tn + fn
    acc = (tp + tn) / total
    prec = tp / (tp + fp) if (tp + fp) > 0 else 0
    rec = tp / (tp + fn) if (tp + fn) > 0 else 0
    spec = tn / (tn + fp) if (tn + fp) > 0 else 0
    bal_acc = 0.5 * (rec + spec)
    f1 = 2 * prec * rec / (prec + rec) if (prec + rec) > 0 else 0

    print("==================================================")
    print("HYPERMOON EVALUATION ON IDENTICAL AUDIO BENCHMARK:")
    print("==================================================")
    print(f"TP={tp}, FP={fp}, TN={tn}, FN={fn}")
    print(f"Accuracy: {acc*100:.2f}% | Balanced Accuracy: {bal_acc*100:.2f}%")
    print(f"Precision: {prec*100:.2f}% | Recall: {rec*100:.2f}% | Specificity: {spec*100:.2f}%")
    print(f"F1-Score: {f1*100:.2f}%")
    print(f"Mean Latency: {np.mean(latencies):.2f} ms")
    print("\nDetailed predictions:")
    for p in probs:
        print(f"{p['file']}: GT={p['gt']} -> Pred={p['pred']} (P_fake={p['p_fake']:.4f}, P_real={p['p_real']:.4f})")

if __name__ == "__main__":
    evaluate_hypermoon()
