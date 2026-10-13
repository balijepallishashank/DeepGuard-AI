import os
import sys
import io
import time
import json
import tempfile
import cv2
import torch
import numpy as np
import soundfile as sf
from httpx import ASGITransport, AsyncClient
import anyio

from app.main import app
from app.model_loader import DeepfakeDetectorService
from app.audio_model_loader import AudioDeepfakeDetectorService


def create_dummy_wav(duration_sec=2.5, sr=16000):
    t = np.linspace(0, duration_sec, int(sr * duration_sec), endpoint=False)
    sig = (0.5 * np.sin(2 * np.pi * 350 * t) + 0.2 * np.sin(2 * np.pi * 700 * t)).astype(np.float32)
    buf = io.BytesIO()
    sf.write(buf, sig, sr, format="WAV")
    return buf.getvalue()


def create_dummy_mp3(duration_sec=2.0, sr=16000):
    t = np.linspace(0, duration_sec, int(sr * duration_sec), endpoint=False)
    sig = (0.4 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)
    buf = io.BytesIO()
    sf.write(buf, sig, sr, format="MP3")
    return buf.getvalue()


def create_dummy_video():
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        temp_path = tmp.name
    try:
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(temp_path, fourcc, 10, (64, 64))
        for i in range(12):
            frame = np.full((64, 64, 3), (i * 20, 120, 200), dtype=np.uint8)
            out.write(frame)
        out.release()
        with open(temp_path, "rb") as f:
            return f.read()
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


async def run_checks():
    print("=" * 70)
    print("DEEPGUARD AI — PHASE 3 FULL VERIFICATION SUITE")
    print("=" * 70)

    # 1. OpenCV Verification
    print("\n--- 1. OPENCV VERIFICATION ---")
    print(f"cv2 version: {cv2.__version__}")
    print("OpenCV loaded successfully in backend virtual environment.")

    # 2. Service Initialization
    print("\n--- 2. MODEL INITIALIZATION ---")
    detector = DeepfakeDetectorService.get_instance()
    detector.initialize()
    audio_detector = AudioDeepfakeDetectorService.get_instance()
    audio_detector.initialize()

    print(f"Image Model: {detector.model_id} on {detector.device} (ready={detector.is_ready})")
    print(f"Audio Model: {audio_detector.model_id} on {audio_detector.device} (ready={audio_detector.is_ready})")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 3. Health Check
        print("\n--- 3. HEALTH API VERIFICATION ---")
        resp = await client.get("/health")
        print(f"GET /health: {resp.status_code}")
        health_data = resp.json()
        print(json.dumps(health_data, indent=2))
        assert resp.status_code == 200
        assert health_data["status"] == "ok"
        assert health_data["model_ready"] is True
        assert health_data["audio_model_ready"] is True

        # 4. Image Inference
        print("\n--- 4. IMAGE INFERENCE VERIFICATION ---")
        fixture_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "fixtures", "sample_valid.png"))
        with open(fixture_path, "rb") as f:
            img_bytes = f.read()
        resp = await client.post(
            "/api/v1/analyze/image",
            files={"file": ("sample_valid.png", img_bytes, "image/png")}
        )
        print(f"POST /api/v1/analyze/image: {resp.status_code}")
        img_res = resp.json()
        print(f"Predicted: {img_res['predicted_label']} (confidence: {img_res['confidence_score']:.4f})")
        print(f"Inference Latency: {img_res['inference_time_ms']} ms on {img_res['device_used']}")
        assert resp.status_code == 200
        assert img_res["success"] is True

        # 5. Video Inference
        print("\n--- 5. VIDEO INFERENCE VERIFICATION ---")
        vid_bytes = create_dummy_video()
        resp = await client.post(
            "/api/v1/analyze/video",
            files={"file": ("test_clip.mp4", vid_bytes, "video/mp4")}
        )
        print(f"POST /api/v1/analyze/video: {resp.status_code}")
        vid_res = resp.json()
        print(f"Video Classification: {vid_res['video_classification']} (confidence: {vid_res['overall_confidence']:.4f})")
        print(f"Sampled Frames: {vid_res['sampled_frames_count']} frames; Latency: {vid_res['inference_time_ms']} ms")
        assert resp.status_code == 200
        assert vid_res["success"] is True

        # 6. Audio Inference (WAV)
        print("\n--- 6. AUDIO INFERENCE VERIFICATION (WAV) ---")
        wav_bytes = create_dummy_wav(duration_sec=3.0, sr=16000)
        resp = await client.post(
            "/api/v1/analyze/audio",
            files={"file": ("sample_audio.wav", wav_bytes, "audio/wav")}
        )
        print(f"POST /api/v1/analyze/audio [WAV]: {resp.status_code}")
        wav_res = resp.json()
        print(f"Predicted: {wav_res['predicted_label']} (confidence: {wav_res['confidence_score']:.4f})")
        print(f"Duration: {wav_res['duration_seconds']}s, Sample Rate: {wav_res['sample_rate']} Hz, Channels: {wav_res['channels']}")
        print(f"Fake Probability: {wav_res['fake_probability_percentage']}%")
        print(f"Spectral Anomaly Score: {wav_res['spectral_anomaly_score']}/100")
        print(f"Segments Count: {len(wav_res['segments'])}")
        print(f"Inference Latency: {wav_res['inference_time_ms']} ms on {wav_res['device_used']}")
        assert resp.status_code == 200
        assert wav_res["success"] is True

        # 7. Audio Inference (MP3)
        print("\n--- 7. AUDIO INFERENCE VERIFICATION (MP3) ---")
        mp3_bytes = create_dummy_mp3(duration_sec=2.0, sr=16000)
        resp = await client.post(
            "/api/v1/analyze/audio",
            files={"file": ("sample_audio.mp3", mp3_bytes, "audio/mpeg")}
        )
        print(f"POST /api/v1/analyze/audio [MP3]: {resp.status_code}")
        mp3_res = resp.json()
        print(f"Predicted: {mp3_res['predicted_label']} (confidence: {mp3_res['confidence_score']:.4f})")
        print(f"Fake Probability: {mp3_res['fake_probability_percentage']}%")
        assert resp.status_code == 200
        assert mp3_res["success"] is True

    print("\n" + "=" * 70)
    print("ALL VERIFICATIONS COMPLETED SUCCESSFULLY WITH ZERO ERRORS!")
    print("=" * 70)
    return True


if __name__ == "__main__":
    anyio.run(run_checks)
