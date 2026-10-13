import os
import json
import time
import torch
from PIL import Image
import numpy as np
from transformers import AutoImageProcessor, AutoModelForImageClassification

EVAL_ROOT = os.path.abspath("evaluation_dataset")
MANIFEST_PATH = os.path.join(EVAL_ROOT, "manifest.json")

def evaluate_image_candidate(model_id="dima806/deepfake_vs_real_image_detection"):
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    img_records = [r for r in manifest["records"] if r["modality"] == "image"]
    print(f"Loading candidate image model: {model_id}...")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    try:
        processor = AutoImageProcessor.from_pretrained(model_id)
        model = AutoModelForImageClassification.from_pretrained(model_id).to(device)
        model.eval()
    except Exception as e:
        print(f"Failed to load {model_id}: {e}")
        return

    print("Config id2label:", model.config.id2label)
    # Check which index is Fake vs Real
    fake_idx = None
    real_idx = None
    for idx, lbl in model.config.id2label.items():
        lbl_lower = lbl.lower()
        if "fake" in lbl_lower or "spoof" in lbl_lower:
            fake_idx = int(idx)
        elif "real" in lbl_lower or "bonafide" in lbl_lower:
            real_idx = int(idx)
    print(f"Mapped fake_idx={fake_idx}, real_idx={real_idx}")

    y_true = []
    y_pred = []
    latencies = []
    slice_data = {}
    probs = []

    for r in img_records:
        fp = os.path.join(EVAL_ROOT, r["filename"])
        if not os.path.exists(fp):
            continue
        gt = r["ground_truth"]
        cond = r.get("condition", "standard")
        if cond not in slice_data:
            slice_data[cond] = {"y_true": [], "y_pred": []}

        with Image.open(fp) as pil_img:
            rgb_img = pil_img.convert("RGB")
            t0 = time.perf_counter()
            inputs = processor(images=rgb_img, return_tensors="pt")
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
        slice_data[cond]["y_true"].append(gt)
        slice_data[cond]["y_pred"].append(pred_lbl)
        probs.append({"file": r["filename"], "gt": gt, "cond": cond, "p_fake": p_fake, "pred": pred_lbl})

    def calc(y_t, y_p):
        tp = sum(1 for yt, yp in zip(y_t, y_p) if yt == "Fake" and yp == "Fake")
        fp = sum(1 for yt, yp in zip(y_t, y_p) if yt == "Real" and yp == "Fake")
        tn = sum(1 for yt, yp in zip(y_t, y_p) if yt == "Real" and yp == "Real")
        fn = sum(1 for yt, yp in zip(y_t, y_p) if yt == "Fake" and yp == "Real")
        tot = tp + fp + tn + fn
        acc = (tp + tn) / tot if tot > 0 else 0
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0
        spec = tn / (tn + fp) if (tn + fp) > 0 else 0
        bal = 0.5 * (rec + spec)
        f1 = 2 * prec * rec / (prec + rec) if (prec + rec) > 0 else 0
        return {
            "total": tot, "tp": tp, "fp": fp, "tn": tn, "fn": fn,
            "accuracy": round(acc * 100, 2), "balanced_acc": round(bal * 100, 2),
            "precision": round(prec * 100, 2), "recall": round(rec * 100, 2),
            "specificity": round(spec * 100, 2), "f1": round(f1 * 100, 2)
        }

    overall = calc(y_true, y_pred)
    print("=" * 60)
    print(f"CANDIDATE IMAGE MODEL EVALUATION: {model_id}")
    print("=" * 60)
    print(f"TP={overall['tp']}, FP={overall['fp']}, TN={overall['tn']}, FN={overall['fn']}")
    print(f"Accuracy: {overall['accuracy']}% | Balanced Accuracy: {overall['balanced_acc']}%")
    print(f"Precision: {overall['precision']}% | Recall: {overall['recall']}% | Specificity: {overall['specificity']}%")
    print(f"F1: {overall['f1']}% | Latency: {np.mean(latencies):.2f} ms")

    print("\nSlice breakdown:")
    for cond, data in slice_data.items():
        res = calc(data["y_true"], data["y_pred"])
        print(f"  Condition '{cond}': Acc={res['accuracy']}%, BalAcc={res['balanced_acc']}%, Recall={res['recall']}%, Spec={res['specificity']}%")

    print("\nSample predictions:")
    for p in probs[:10]:
        print(f"  {p['file']} [{p['cond']}]: GT={p['gt']} -> Pred={p['pred']} (P_fake={p['p_fake']:.4f})")

if __name__ == "__main__":
    evaluate_image_candidate()
