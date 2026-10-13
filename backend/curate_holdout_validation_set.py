"""
DeepGuard AI — Phase 5: Separate Holdout Validation Dataset Curation
Streams from 'train' split of akahana/deepfake-detection-dataset-v3,
guaranteeing 100% disjoint separation from the Phase 4 evaluation dataset (which used 'test' split).
"""

import os
import json
import hashlib
from PIL import Image
from datasets import load_dataset

HOLDOUT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "validation_holdout_dataset"))
MANIFEST_PATH = os.path.join(HOLDOUT_ROOT, "manifest.json")

def sha256_of_file(filepath: str) -> str:
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def curate_holdout():
    dest_genuine = os.path.join(HOLDOUT_ROOT, "images", "genuine")
    dest_synthetic = os.path.join(HOLDOUT_ROOT, "images", "synthetic")
    dest_jpeg = os.path.join(HOLDOUT_ROOT, "images", "challenge_jpeg")
    os.makedirs(dest_genuine, exist_ok=True)
    os.makedirs(dest_synthetic, exist_ok=True)
    os.makedirs(dest_jpeg, exist_ok=True)

    print("Streaming completely disjoint holdout partition from akahana train split...")
    ds = load_dataset("akahana/deepfake-detection-dataset-v3", split="train", streaming=True)

    TARGET_GENUINE = 20
    TARGET_SYNTHETIC = 20
    saved_gen = 0
    saved_synth = 0

    manifest_records = []

    for item in ds:
        if saved_gen >= TARGET_GENUINE and saved_synth >= TARGET_SYNTHETIC:
            break

        lbl = item["label"]
        img: Image.Image = item["image"]
        if img.mode != "RGB":
            img = img.convert("RGB")

        # In akahana: label 1 = authentic/genuine, label 0 = deepfake/synthetic
        if lbl == 1 and saved_gen < TARGET_GENUINE:
            fn = f"holdout_genuine_{saved_gen:02d}.png"
            fp = os.path.join(dest_genuine, fn)
            img.save(fp, format="PNG")
            sha = sha256_of_file(fp)

            manifest_records.append({
                "id": f"HOLD-IMG-GEN-{saved_gen:02d}",
                "filename": os.path.relpath(fp, HOLDOUT_ROOT).replace("\\", "/"),
                "ground_truth": "Real",
                "condition": "standard",
                "resolution": f"{img.width}x{img.height}",
                "sha256": sha
            })

            # Add JPEG Q45 compressed variant for first 5
            if saved_gen < 5:
                jp_fn = f"holdout_challenge_jpeg_gen_{saved_gen:02d}.jpg"
                jp_fp = os.path.join(dest_jpeg, jp_fn)
                img.save(jp_fp, format="JPEG", quality=45)
                jp_sha = sha256_of_file(jp_fp)
                manifest_records.append({
                    "id": f"HOLD-IMG-CHAL-GEN-{saved_gen:02d}",
                    "filename": os.path.relpath(jp_fp, HOLDOUT_ROOT).replace("\\", "/"),
                    "ground_truth": "Real",
                    "condition": "compressed_jpeg_q45",
                    "resolution": f"{img.width}x{img.height}",
                    "sha256": jp_sha
                })

            saved_gen += 1

        elif lbl == 0 and saved_synth < TARGET_SYNTHETIC:
            fn = f"holdout_synthetic_{saved_synth:02d}.png"
            fp = os.path.join(dest_synthetic, fn)
            img.save(fp, format="PNG")
            sha = sha256_of_file(fp)

            manifest_records.append({
                "id": f"HOLD-IMG-SYN-{saved_synth:02d}",
                "filename": os.path.relpath(fp, HOLDOUT_ROOT).replace("\\", "/"),
                "ground_truth": "Fake",
                "condition": "standard",
                "resolution": f"{img.width}x{img.height}",
                "sha256": sha
            })

            # Add JPEG Q45 compressed variant for first 5
            if saved_synth < 5:
                jp_fn = f"holdout_challenge_jpeg_synth_{saved_synth:02d}.jpg"
                jp_fp = os.path.join(dest_jpeg, jp_fn)
                img.save(jp_fp, format="JPEG", quality=45)
                jp_sha = sha256_of_file(jp_fp)
                manifest_records.append({
                    "id": f"HOLD-IMG-CHAL-SYN-{saved_synth:02d}",
                    "filename": os.path.relpath(jp_fp, HOLDOUT_ROOT).replace("\\", "/"),
                    "ground_truth": "Fake",
                    "condition": "compressed_jpeg_q45",
                    "resolution": f"{img.width}x{img.height}",
                    "sha256": jp_sha
                })

            saved_synth += 1

    manifest = {
        "dataset_name": "DeepGuard AI Phase 5 Disjoint Holdout Validation Dataset",
        "description": "Completely disjoint train-split partition used to independently tune and validate decision thresholds.",
        "sample_count": len(manifest_records),
        "records": manifest_records
    }

    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"Holdout dataset saved: {saved_gen} Genuine, {saved_synth} Synthetic (Total with JPEG: {len(manifest_records)}) to {MANIFEST_PATH}")

if __name__ == "__main__":
    curate_holdout()
