import os
import sys
import hashlib
import time
import json
import torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForImageClassification
from httpx import ASGITransport, AsyncClient
import anyio

async def test_health_api():
    from app.main import app
    from app.model_loader import DeepfakeDetectorService
    detector = DeepfakeDetectorService.get_instance()
    detector.initialize()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")
        return resp.status_code, resp.json()

def main():
    print("=" * 70)
    print("PHASE 2B: MODEL VERIFICATION, INFERENCE, & HEALTH CHECK")
    print("=" * 70)

    # 1. Image verification
    img_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "fixtures", "sample_valid.png"))
    print("\n--- 1. IMAGE FIXTURE INTEGRITY CHECK ---")
    print(f"Target file: {img_path}")
    if not os.path.exists(img_path):
        print(f"ERROR: File does not exist at {img_path}")
        return False
    
    file_size = os.path.getsize(img_path)
    with open(img_path, "rb") as f:
        data = f.read()
    sha256 = hashlib.sha256(data).hexdigest()
    print(f"File size: {file_size} bytes")
    print(f"SHA-256 hash: {sha256}")

    try:
        with Image.open(img_path) as img:
            format_name = img.format
            mode = img.mode
            dimensions = img.size
            img.verify()
        # Re-open after verify()
        with Image.open(img_path) as img:
            img_rgb = img.convert("RGB")
        print(f"Image format: {format_name}")
        print(f"Color mode: {mode}")
        print(f"Dimensions: {dimensions[0]}x{dimensions[1]} px")
        print("Image validity: VALID (integrity confirmed via PIL verify)")
    except Exception as e:
        print(f"ERROR: Image is invalid/corrupt: {e}")
        return False

    # 2. Model file status & loading
    print("\n--- 2. MODEL CACHE & WEIGHTS STATUS ---")
    cache_dir = os.path.expanduser("~/.cache/huggingface/hub/models--king1oo1--deepfake-model/snapshots/d0bb73205003d6b4c5a312d071e12304ef819111")
    weights_path = os.path.join(cache_dir, "model.safetensors")
    if os.path.exists(weights_path):
        w_size = os.path.getsize(weights_path)
        print(f"Local weights path: {weights_path}")
        print(f"Weights file size: {w_size} bytes ({round(w_size / (1024*1024), 2)} MB)")
    else:
        print("Weights file not found in local cache path!")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    gpu_name = torch.cuda.get_device_name(0) if device == "cuda" else "CPU"
    print(f"Compute device: {device} ({gpu_name})")

    model_id = "king1oo1/deepfake-model"
    print(f"Loading processor and model ({model_id})...")
    load_start = time.perf_counter()
    processor = AutoImageProcessor.from_pretrained(model_id)
    model = AutoModelForImageClassification.from_pretrained(model_id)
    model.to(device)
    model.eval()
    load_time_s = round(time.perf_counter() - load_start, 2)
    print(f"Loaded successfully in {load_time_s}s")
    print(f"Architecture: {model.__class__.__name__}")
    print(f"Label Mapping (id2label): {model.config.id2label}")
    print(f"Label Mapping (label2id): {model.config.label2id}")

    # 3. Genuine Inference on fixtures/sample_valid.png
    print("\n--- 3. GENUINE INFERENCE EXECUTION ---")
    inputs = processor(images=img_rgb, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}

    # Warmup
    with torch.inference_mode():
        _ = model(**inputs)
    if device == "cuda":
        torch.cuda.synchronize()

    # Timed inference
    t0 = time.perf_counter()
    with torch.inference_mode():
        outputs = model(**inputs)
        logits = outputs.logits.squeeze(0)
        probabilities = torch.softmax(logits, dim=-1)
    if device == "cuda":
        torch.cuda.synchronize()
    inf_time_ms = round((time.perf_counter() - t0) * 1000, 2)

    pred_idx = int(torch.argmax(probabilities).item())
    pred_label = model.config.id2label.get(pred_idx, str(pred_idx))
    pred_prob = float(probabilities[pred_idx].item())

    raw_logits_list = [round(float(x), 4) for x in logits.tolist()]
    softmax_scores = []
    for class_id, prob in enumerate(probabilities):
        label_str = model.config.id2label.get(class_id, f"Class_{class_id}")
        prob_float = float(prob.item())
        logit_float = float(logits[class_id].item())
        softmax_scores.append({
            "class_id": class_id,
            "label": label_str,
            "raw_logit": round(logit_float, 4),
            "softmax_probability": round(prob_float, 6),
            "percentage": f"{prob_float * 100:.2f}%"
        })

    print(f"Inference Device: {device}")
    print(f"Execution Time: {inf_time_ms} ms")
    print(f"Raw Logits: {raw_logits_list}")
    print("Softmax Scores:")
    for s in softmax_scores:
        print(f"  [{s['class_id']}] {s['label']}: {s['percentage']} (softmax: {s['softmax_probability']}, logit: {s['raw_logit']})")
    print(f"Actual Predicted Label: {pred_label} (Confidence: {pred_prob*100:.2f}%)")

    # 4. Verify Health Endpoint
    print("\n--- 4. API HEALTH ENDPOINT VERIFICATION ---")
    status_code, health_json = anyio.run(test_health_api)
    print(f"HTTP Status: {status_code}")
    print(f"Health Response JSON:\n{json.dumps(health_json, indent=2)}")
    assert status_code == 200, f"Expected 200, got {status_code}"
    assert health_json["status"] == "ok"
    assert health_json["model_ready"] is True
    assert health_json["device"] == device
    print("Health check validation: PASSED (model readiness correctly reported)")

    print("\n" + "=" * 70)
    print("ALL PHASE 2B VERIFICATIONS COMPLETED SUCCESSFULLY")
    print("=" * 70)
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
