# DeepGuard AI — Multimodal Deepfake Forensic & Detection Suite

DeepGuard AI is an enterprise-grade, privacy-first multimodal AI deepfake detection application. It provides real-time forensic analysis and neural classification for **images, video, and audio**, backed by a local PyTorch CUDA backend and a high-performance React 19 + TypeScript frontend.

---

## 🌟 Key Features

- **Multimodal Neural Detection**:
  - **Image Forensics**: Primary detection via `prithivMLmods/Deep-Fake-Detector-v2-Model` (Vision Transformer ViT, 85.8M parameters) with transparent fallback to `king1oo1/deepfake-model` (Google SigLIP vision backbone, 92.8M parameters).
  - **Video Forensics**: Frame-sampled spatial analysis extracting 16 representative frames across the timeline via OpenCV, with frame-by-frame anomaly scoring and aggregation.
  - **Audio Forensics**: Synthetic voice and voice clone detection via `MelodyMachine/Deepfake-audio-detection-V2` (Wav2Vec2, 94.4M parameters) resampled to 16 kHz.
- **Client-Side Forensics Engine**:
  - Error Level Analysis (ELA) for image compression inconsistencies.
  - Color space distribution analysis (RGB histogram entropy & variance).
  - Spatial noise analysis and Laplacian blur detection.
  - Luminance gradient and edge discontinuity mapping.
- **Privacy & Security**:
  - 100% local model inference without sending customer media to third-party cloud APIs.
  - Automatic memory cleanup and temporary file deletion on completion or failure.
  - Image decompression bomb protection (`MAX_IMAGE_PIXELS = 89,478,485`) and strict magic-byte validation.
  - Upload size limit enforced at 50 MB.
- **Calibrated Verdicts**:
  - Statistical confidence thresholding with dedicated `INCONCLUSIVE` verdict margin ($[0.70, 0.76]$) to prevent false certainty.
  - Authenticity trust scoring capped to reflect that no statistical neural classifier can guarantee authenticity with 100% certainty.

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   React 19 Frontend                    │
│      Vite + TypeScript + Lucide Icons + Tailwind       │
│                                                        │
│  - UploadZone (Drag & Drop, Media Type Detection)      │
│  - AnalysisResultSummary (Dial, Metrics, Badges)       │
│  - MediaAutopsyView (ELA, Histograms, Noise Map)       │
│  - VideoAnalysisView (Frame Timeline & Aggregation)    │
│  - AudioAnalysisView (Spectral Waveform & Voice Clone) │
│  - HistoryView (IndexedDB Local Storage & Export)      │
└───────────────┬────────────────────────▲───────────────┘
                │                        │
       HTTP POST│Multipart Files         │JSON Telemetry
       VITE_API_BASE_URL                 │Verdicts & Scores
                │                        │
┌───────────────▼────────────────────────┴───────────────┐
│                    FastAPI Backend                     │
│                Python 3.13 + Uvicorn                   │
│                                                        │
│  GET  /health                                          │
│  POST /api/v1/analyze/image                            │
│  POST /api/v1/analyze/video                            │
│  POST /api/v1/analyze/audio                            │
└───────────────┬────────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────────┐
│             PyTorch CUDA Inference Engine              │
│          NVIDIA GeForce RTX 4050 Laptop GPU            │
│                                                        │
│  - ViT Image Model (prithivMLmods/Deep-Fake-Detector)  │
│  - SigLIP Fallback (king1oo1/deepfake-model)           │
│  - Wav2Vec2 Audio (MelodyMachine/Deepfake-audio-V2)    │
│  - OpenCV Video Extractor (16 Frame Spatial Aggregation)│
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ (v20+ recommended)
- **Python**: 3.11 - 3.13 with 64-bit architecture
- **NVIDIA GPU** with CUDA 12.4 (optional; CPU execution supported automatically)

---

### Step 1: Set Up Backend

```powershell
# 1. Navigate to backend directory
cd backend

# 2. Create virtual environment
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1

# 3. Upgrade pip
python -m pip install --upgrade pip

# 4. Install PyTorch with CUDA 12.4
python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124

# 5. Install requirements
python -m pip install -r requirements.txt

# 6. Start the FastAPI backend server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend will start at `http://127.0.0.1:8000`. Test it with:
```powershell
curl http://127.0.0.1:8000/health
```

---

### Step 2: Set Up Frontend

In a separate terminal:

```powershell
# 1. From the project root
npm install

# 2. Configure environment (optional, defaults to http://127.0.0.1:8000)
# Create .env or .env.local:
# VITE_API_BASE_URL=http://127.0.0.1:8000
# VITE_SUPABASE_URL=https://eehwhtxdnmngmaushwzv.supabase.co
# VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# 3. Start development server
npm run dev
```

The frontend will start at `http://127.0.0.1:5173`.

---

## 🔐 Supabase Authentication & Cloud History

### 1. Centralized Authentication
- **Email & Password**: Registration with email confirmation support, password login, and session persistence across browser reloads.
- **Password Reset**: Automated password recovery flow via Supabase Auth email redirect to `PasswordResetModal`.
- **Google OAuth**: Pre-wired OAuth flow using Supabase `signInWithOAuth({ provider: 'google' })`.
- **Demo Mode**: Instant `Explore Demo Investigator Account` evaluation mode for offline or rapid UI testing.

### 2. Server-Side FastAPI Token Verification
All analysis routes independently verify caller JWT tokens server-side using PyJWT and Supabase JWKS:
- **Algorithm**: Asymmetric `ES256` (ECDSA P-256) signature verification via `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json` (with fallback to `HS256` symmetric secret).
- **Claims Verified**: Token signature, expiry (`exp`), issuer (`iss`), and audience (`aud="authenticated"`).
- **Attribution**: Extracts `sub` (User UUID) and attaches it to the request lifecycle via `Depends(get_current_user)`.
- **Zero-Bypass Security**: Rejects unauthenticated requests with `401 Unauthorized` without falling back to fake predictions.

### 3. Cloud Analysis History with Row Level Security (RLS)
The database migration located at `supabase/migrations/20261010_analysis_history.sql` provisions a user-isolated history store:
- **Table**: `public.analysis_history`
- **Ownership**: Foreign key `user_id REFERENCES auth.users(id) ON DELETE CASCADE`.
- **Privacy Rule**: Media binaries are **NEVER** stored in PostgreSQL. Only structured analysis telemetry, verdicts, and forensic scores are persisted as JSONB.
- **Row Level Security**: Explicit policies enforce that users can only SELECT, INSERT, UPDATE, and DELETE their own records:
  ```sql
  CREATE POLICY "Users can select own history records"
      ON public.analysis_history FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  ```
- **Local Migration**: Non-destructive synchronization skips demo preset records (`TL-` prefix) and deduplicates based on record ID and SHA-256 checksums.

---

## 🧪 Verification & Testing

### Backend Security & Forensic Tests
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest -v
```
*Current status*: **29/29 PASSED** (22 forensic unit tests + 7 server-side auth token verification tests).

### Frontend Linting & Build
```powershell
# Run Oxlint
npm run lint

# Run TypeScript + Vite production build
npm run build
```
*Current status*: **0 warnings, 0 errors** on 37 files; production bundle builds cleanly.

### End-to-End Automated Verification Suites
Run the headless Puppeteer verification scripts against active local servers:
```powershell
# 1. Complete Supabase Auth & Cloud History E2E (9/9 checks)
node scripts/verify-auth-e2e.mjs

# 2. Calibrated Multimodal Forensic Pipeline E2E (5/5 checks)
node scripts/verify-phase6-calibrated-e2e.mjs

# 3. Offline Handling & API Base URL Normalization
node scripts/verify-offline-and-env.mjs
```

---

## 📡 API Specification

| Endpoint | Method | Auth Required | Input | Output |
| :--- | :--- | :--- | :--- | :--- |
| `/health` | `GET` | ❌ Public | None | API status, active models, GPU telemetry |
| `/api/v1/auth/me` | `GET` | ✅ Bearer JWT | None | Verified user ID, email, role |
| `/api/v1/analyze/image` | `POST` | ✅ Bearer JWT | `multipart/form-data` (`file`) | Hash, label, confidence, verdict, threshold bounds |
| `/api/v1/analyze/video` | `POST` | ✅ Bearer JWT | `multipart/form-data` (`file`) | Duration, resolution, frame scores, aggregate verdict |
| `/api/v1/analyze/audio` | `POST` | ✅ Bearer JWT | `multipart/form-data` (`file`) | Synthetic/authentic probabilities, sample rate, verdict |

---

## 🛡️ License

Private and proprietary. DeepGuard AI Architecture & Forensics Suite.
