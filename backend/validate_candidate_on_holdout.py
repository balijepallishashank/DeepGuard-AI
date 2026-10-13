"""
DeepGuard AI — Phase 5: Threshold Tuning & Validation on Disjoint Holdout Dataset
Evaluates prithivMLmods/Deep-Fake-Detector-v2-Model on the 50-sample holdout dataset.
Tests decision thresholds, measures probability distributions, and evaluates Inconclusive band.
"""

import os
import json
import time
import torch
from PIL import Image
import numpy as np
from transformers import AutoImageProcessor, AutoModelForImageClassification

HOLDOUT_ROOT = os.path.abspath("validation_holdout_dataset")
MANIFEST_PATH = os.path.join(HOLDOUT_ROOT, "manifest.json")

def validate_holdout():
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    records = manifest["records"]
    print(f"Loaded {len(records)} holdout samples from {MANIFEST_PATH}")

    model_id = "prithivMLmods/Deep-Fake-Detector-v2-Model"
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Loading {model_id} on {device}...")

    processor = AutoImageProcessor.from_pretrained(model_id)
    model = AutoModelForImageClassification.from_pretrained(model_id).to(device)
    model.eval()

    real_p_fakes = []
    fake_p_fakes = []
    all_results = []

    for r in records:
        fp = os.path.join(HOLDOUT_ROOT, r["filename"])
        gt = r["ground_truth"]
        cond = r.get("condition", "standard")

        with Image.open(fp) as img:
            inputs = processor(images=img.convert("RGB"), return_tensors="pt").to(device)
            with torch.no_grad():
                logits = model(**inputs).logits
                sm = torch.softmax(logits, dim=-1).squeeze().cpu().numpy()

        p_fake = float(sm[1])
        all_results.append({
            "id": r["id"],
            "filename": r["filename"],
            "ground_truth": gt,
            "condition": cond,
            "p_fake": p_fake
        })

        if gt == "Real":
            real_p_fakes.append(p_fake)
        else:
            fake_p_fakes.append(p_fake)

    print("\n" + "=" * 60)
    print("PROBABILITY DISTRIBUTION ON DISJOINT HOLDOUT DATASET:")
    print("=" * 60)
    print(f"REAL Images (N={len(real_p_fakes)}): min={np.min(real_p_fakes):.4f}, max={np.max(real_p_fakes):.4f}, mean={np.mean(real_p_fakes):.4f}, median={np.median(real_p_fakes):.4f}")
    print(f"FAKE Images (N={len(fake_p_fakes)}): min={np.min(fake_p_fakes):.4f}, max={np.max(fake_p_fakes):.4f}, mean={np.mean(fake_p_fakes):.4f}, median={np.median(fake_p_fakes):.4f}")

    print("\n" + "=" * 60)
    print("THRESHOLD SWEEP ON HOLDOUT DATASET (WITHOUT INCONCLUSIVE):")
    print("=" * 60)
    thresholds = [0.50, 0.55, 0.60, 0.65, 0.70, 0.72, 0.74, 0.75, 0.76, 0.78, 0.80]
    for th in thresholds:
        tp = sum(1 for p in fake_p_fakes if p >= th)
        fn = sum(1 for p in fake_p_fakes if p < th)
        fp = sum(1 for p in real_p_fakes if p >= th)
        tn = sum(1 for p in real_p_fakes if p < th)
        tot = tp + fp + tn + fn
        acc = (tp + tn) / tot if tot > 0 else 0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0
        spec = tn / (tn + fp) if (tn + fp) > 0 else 0
        bal = 0.5 * (rec + spec)
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0
        f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0
        print(f"Thresh={th:.2f} | Acc={acc*100:5.1f}% | BalAcc={bal*100:5.1f}% | Rec={rec*100:5.1f}% | Spec={spec*100:5.1f}% | Prec={prec*100:5.1f}% | F1={f1*100:5.1f}% | TP={tp:2d}, FP={fp:2d}, TN={tn:2d}, FN={fn:2d}")

    print("\n" + "=" * 60)
    print("EVALUATION WITH INCONCLUSIVE BAND [lower_th, upper_th]:")
    print("=" * 60)
    # If p_fake > upper_th -> Fake
    # If p_fake < lower_th -> Real
    # If lower_th <= p_fake <= upper_th -> Inconclusive
    bands = [
        (0.65, 0.78),
        (0.68, 0.78),
        (0.70, 0.78),
        (0.70, 0.76),
        (0.72, 0.78)
    ]
    for low, high in bands:
        fake_correct = sum(1 for p in fake_p_fakes if p > high)
        fake_inconclusive = sum(1 for p in fake_p_fakes if low <= p <= high)
        fake_incorrect = sum(1 for p in fake_p_fakes if p < low)

        real_correct = sum(1 for p in real_p_fakes if p < low)
        real_inconclusive = sum(1 for p in real_p_fakes if low <= p <= high)
        real_incorrect = sum(1 for p in real_p_fakes if p > high)

        total_conclusive = fake_correct + fake_incorrect + real_correct + real_incorrect
        conclusive_acc = (fake_correct + real_correct) / total_conclusive if total_conclusive > 0 else 0

        print(f"Band [{low:.2f}, {high:.2f}]:")
        print(f"  Fake: {fake_correct}/{len(fake_p_fakes)} correct, {fake_inconclusive} inconclusive, {fake_incorrect} false negative")
        print(f"  Real: {real_correct}/{len(real_p_fakes)} correct, {real_inconclusive} inconclusive, {real_incorrect} false positive")
        print(f"  Conclusive Accuracy: {conclusive_acc*100:.1f}% (Inconclusive Rate: {(fake_inconclusive + real_inconclusive)/len(records)*100:.1f}%)")

if __name__ == "__main__":
    validate_holdout()
