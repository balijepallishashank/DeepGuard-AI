# DeepGuard AI — Multimodal Forensic & Detection Backend

This service provides a local, self-contained Python backend for multimodal AI deepfake detection (Image, Video, Audio) using Hugging Face Transformers and PyTorch, without requiring external paid cloud APIs.

---

## Architecture Overview

- **Framework**: FastAPI (asynchronous ASGI REST service on Uvicorn)
- **Image Detection Models**:
  - Primary Candidate: `prithivMLmods/Deep-Fake-Detector-v2-Model` (Vision Transformer ViT, 85.8M parameters)
  - Baseline Fallback: `king1oo1/deepfake-model` (Google SigLIP vision backbone, 92.8M parameters)
- **Audio Detection Model**:
  - Primary: `MelodyMachine/Deepfake-audio-detection-V2` (Wav2Vec2 architecture, 94.4M parameters)
- **Video Detection Pipeline**:
  - Frame-sampled spatial analysis: extracts 16 uniform representative frames across the video timeline via OpenCV (`cv2`), performs batched spatial inference through the image vision model, and aggregates frame predictions with spatial artifact anomaly weighting.
- **Hardware Acceleration**: Automatic GPU detection via PyTorch with NVIDIA CUDA 12.4 runtime; seamless CPU fallback if CUDA is absent.
- **Port**: `http://127.0.0.1:8000`

---

## Directory Layout

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI app & endpoints (/health, /api/v1/analyze/*)
│   ├── model_loader.py          # Singleton image model manager (ViT + SigLIP fallback)
│   ├── audio_model_loader.py    # Singleton audio model manager (Wav2Vec2)
│   ├── video_processor.py       # Video extraction, 16-frame sampling, and aggregation
│   ├── audio_processor.py       # Audio loading, resampling to 16kHz, chunking
│   ├── schemas.py               # Pydantic v2 schemas for requests & responses
│   └── validation.py            # Magic bytes, max file size, decompression bomb safeguards
├── tests/
│   ├── test_health.py           # API status & model readiness unit tests
│   ├── test_validation.py       # File validation & security tests
│   ├── test_audio_analysis.py   # Audio processing & model tests
│   ├── test_video_analysis.py   # Video processing & frame extraction tests
│   └── test_image_models.py     # Image model inference & threshold tests
├── requirements.txt             # Pinned backend dependencies
└── README.md                    # Backend documentation
```

---

## PowerShell Setup Instructions

### 1. Create and Activate Virtual Environment

```powershell
# Navigate to backend directory
cd "C:\DeepGuard AI\backend"

# Create virtual environment using Python 3.13
py -3.13 -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1
```

### 2. Install Dependencies

```powershell
# Upgrade pip
python -m pip install --upgrade pip

# Install PyTorch & torchvision with CUDA 12.4 support
python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124

# Install Transformers, OpenCV, SoundFile, and API dependencies
python -m pip install -r requirements.txt
```

### 3. Verify CUDA GPU Acceleration

```powershell
python -c "import torch; print('PyTorch:', torch.__version__); print('CUDA Available:', torch.cuda.is_available()); print('GPU Device:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU')"
```

---

## Starting the Backend Server

```powershell
cd "C:\DeepGuard AI\backend"
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Interactive API documentation:
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`
- Health check: `http://127.0.0.1:8000/health`

---

## Running Backend Tests

```powershell
cd "C:\DeepGuard AI\backend"
.\.venv\Scripts\Activate.ps1
pytest -v
```

---

## API Endpoints

### 1. `GET /health`
Returns system status, active image and audio models, parameters, and device telemetry:
```json
{
  "status": "ok",
  "api_version": "1.0.0",
  "model_ready": true,
  "model_name": "prithivMLmods/Deep-Fake-Detector-v2-Model",
  "device": "cuda",
  "gpu_name": "NVIDIA GeForce RTX 4050 Laptop GPU",
  "details": {
    "image_model": {
      "candidate": "prithivMLmods/Deep-Fake-Detector-v2-Model",
      "baseline": "king1oo1/deepfake-model",
      "active": "prithivMLmods/Deep-Fake-Detector-v2-Model",
      "parameters": 85799426
    },
    "audio_model": {
      "model_name": "MelodyMachine/Deepfake-audio-detection-V2",
      "active": "MelodyMachine/Deepfake-audio-detection-V2",
      "parameters": 94371714
    }
  }
}
```

### 2. `POST /api/v1/analyze/image`
- **Method**: POST
- **Content-Type**: `multipart/form-data` (Field: `file`)
- **Accepted Formats**: JPEG, PNG, WebP (up to 50 MB)
- **Returns**: SHA-256 hash, predicted label (`Real` or `Fake`), confidence score (0-1), probability breakdown, verdict status (`REAL`, `FAKE`, `INCONCLUSIVE`), calibration thresholds, and forensic caveats.

### 3. `POST /api/v1/analyze/video`
- **Method**: POST
- **Content-Type**: `multipart/form-data` (Field: `file`)
- **Accepted Formats**: MP4, WebM, QuickTime MOV (up to 50 MB)
- **Returns**: Video metadata (duration, FPS, resolution), sampled frame count (16), frame-level prediction scores, aggregate confidence score, verdict status, and timestamp breakdown.

### 4. `POST /api/v1/analyze/audio`
- **Method**: POST
- **Content-Type**: `multipart/form-data` (Field: `file`)
- **Accepted Formats**: WAV, MP3, OGG, FLAC (up to 50 MB)
- **Returns**: Audio duration, sample rate, synthetic voice probability, authentic voice probability, verdict status (`REAL`, `FAKE`, `INCONCLUSIVE`), and forensic spectral cues.
