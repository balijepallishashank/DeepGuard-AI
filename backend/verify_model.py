import sys
import time
import os
from PIL import Image

def main():
    print("=" * 60)
    print("STEP 1: ENVIRONMENT & PYTORCH VERIFICATION")
    print("=" * 60)
    print(f"Python executable: {sys.executable}")
    print(f"Python version: {sys.version}")

    try:
        import torch
        import torchvision
        print(f"PyTorch version: {torch.__version__}")
        print(f"torchvision version: {torchvision.__version__}")
    except ImportError as e:
        print(f"FAILED to import PyTorch: {e}")
        return False

    print("\n" + "=" * 60)
    print("STEP 2: CUDA GPU ACCELERATION CHECK")
    print("=" * 60)
    cuda_available = torch.cuda.is_available()
    print(f"torch.cuda.is_available(): {cuda_available}")

    if cuda_available:
        gpu_count = torch.cuda.device_count()
        gpu_name = torch.cuda.get_device_name(0)
        print(f"GPU device count: {gpu_count}")
        print(f"GPU Name: {gpu_name}")
        device = "cuda"
    else:
        print("CUDA is NOT available. Falling back to CPU for inference.")
        device = "cpu"

    print("\n" + "=" * 60)
    print("STEP 3: HUGGING FACE MODEL LOADING (king1oo1/deepfake-model)")
    print("=" * 60)
    model_id = "king1oo1/deepfake-model"
    print(f"Loading {model_id} onto {device}...")

    try:
        from transformers import AutoImageProcessor, AutoModelForImageClassification
        
        load_start = time.perf_counter()
        processor = AutoImageProcessor.from_pretrained(model_id)
        model = AutoModelForImageClassification.from_pretrained(model_id)
        model.to(device)
        model.eval()
        load_time = round(time.perf_counter() - load_start, 2)
        print(f"SUCCESS: Model and processor loaded in {load_time}s")
        print(f"Architecture: {model.__class__.__name__}")
        print(f"Configured id2label mapping: {model.config.id2label}")
    except Exception as e:
        print(f"FAILED to load model {model_id}: {e}")
        return False

    print("\n" + "=" * 60)
    print("STEP 4: REAL INFERENCE ON TEST IMAGE")
    print("=" * 60)
    # Check fixtures directory for test image
    test_image_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "fixtures", "sample_valid.png"))
    if not os.path.exists(test_image_path) or os.path.getsize(test_image_path) < 1000:
        test_image_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "fixtures", "sample_valid.jpg"))
    
    if os.path.exists(test_image_path):
        print(f"Using test fixture: {test_image_path}")
        test_img = Image.open(test_image_path).convert("RGB")
    else:
        print(f"Creating a sample RGB image for testing...")
        test_img = Image.new("RGB", (224, 224), color=(128, 128, 128))

    print(f"Input image resolution: {test_img.size}")

    # Preprocessing
    inputs = processor(images=test_img, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}

    # Forward pass
    inf_start = time.perf_counter()
    with torch.inference_mode():
        outputs = model(**inputs)
        logits = outputs.logits.squeeze(0)
        probabilities = torch.softmax(logits, dim=-1)

    if device == "cuda":
        torch.cuda.synchronize()

    inf_time_ms = round((time.perf_counter() - inf_start) * 1000, 2)
    print(f"Inference latency: {inf_time_ms} ms")

    id2label = model.config.id2label
    pred_idx = int(torch.argmax(probabilities).item())
    pred_label = id2label.get(pred_idx, str(pred_idx))
    pred_prob = float(probabilities[pred_idx].item())

    print("\n--- INFERENCE RESULTS ---")
    print(f"Device Used: {device}")
    print(f"Raw Logits: {logits.tolist()}")
    for class_id, prob in enumerate(probabilities):
        lbl = id2label.get(class_id, f"Class_{class_id}")
        raw_l = float(logits[class_id].item())
        print(f"  Class {class_id} ({lbl}): probability={prob.item():.4f} ({prob.item()*100:.2f}%), logit={raw_l:.4f}")

    print(f"\nFinal Prediction: {pred_label} (Confidence: {pred_prob*100:.2f}%)")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
