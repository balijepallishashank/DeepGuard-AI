import io
import os
import pytest
import numpy as np
import soundfile as sf
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.audio_model_loader import AudioDeepfakeDetectorService


@pytest.fixture(scope="module", autouse=True)
def initialize_audio_model():
    """Ensure the audio detector model is loaded before running API tests."""
    detector = AudioDeepfakeDetectorService.get_instance()
    detector.initialize()
    return detector


def create_dummy_wav_bytes(duration_sec: float = 2.0, sr: int = 16000) -> bytes:
    """Helper to generate in-memory valid PCM WAV audio bytes."""
    t = np.linspace(0, duration_sec, int(sr * duration_sec), endpoint=False)
    # Dual-tone audio
    waveform = (0.4 * np.sin(2 * np.pi * 300 * t) + 0.3 * np.sin(2 * np.pi * 600 * t)).astype(np.float32)
    buf = io.BytesIO()
    sf.write(buf, waveform, sr, format="WAV")
    return buf.getvalue()


def create_dummy_mp3_bytes(duration_sec: float = 2.0, sr: int = 16000) -> bytes:
    """Helper to generate in-memory valid MP3 audio bytes."""
    t = np.linspace(0, duration_sec, int(sr * duration_sec), endpoint=False)
    waveform = (0.5 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)
    buf = io.BytesIO()
    sf.write(buf, waveform, sr, format="MP3")
    return buf.getvalue()


@pytest.mark.anyio
async def test_audio_empty_file_rejected():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/analyze/audio",
            files={"file": ("empty.wav", b"", "audio/wav")}
        )
        assert response.status_code == 400
        assert "empty" in response.json()["detail"].lower()


@pytest.mark.anyio
async def test_audio_invalid_extension_rejected():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/analyze/audio",
            files={"file": ("malicious.exe", b"MZ...", "application/octet-stream")}
        )
        assert response.status_code == 415
        assert "unsupported" in response.json()["detail"].lower()


@pytest.mark.anyio
async def test_audio_corrupted_file_rejected():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/analyze/audio",
            files={"file": ("corrupt.wav", b"RIFF1234CORRUPTDATA", "audio/wav")}
        )
        assert response.status_code == 400
        assert "decode" in response.json()["detail"].lower() or "corrupt" in response.json()["detail"].lower()


@pytest.mark.anyio
async def test_audio_oversized_file_rejected():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 51 MB dummy payload with .wav header
        huge_bytes = b"RIFF" + (b"\x00" * (51 * 1024 * 1024))
        response = await client.post(
            "/api/v1/analyze/audio",
            files={"file": ("huge.wav", huge_bytes, "audio/wav")}
        )
        assert response.status_code == 413


@pytest.mark.anyio
async def test_audio_valid_wav_inference():
    wav_bytes = create_dummy_wav_bytes(duration_sec=3.0, sr=16000)
    assert len(wav_bytes) > 0

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/analyze/audio",
            files={"file": ("speech_sample.wav", wav_bytes, "audio/wav")}
        )
        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert data["filename"] == "speech_sample.wav"
        assert len(data["sha256"]) == 64
        assert data["duration_seconds"] > 2.5
        assert data["sample_rate"] == 16000
        assert data["channels"] == 1
        assert data["predicted_label"] in ["Real", "Fake"]
        assert 0.0 <= data["confidence_score"] <= 1.0
        assert 0.0 <= data["fake_probability_percentage"] <= 100.0
        assert 0.0 <= data["spectral_anomaly_score"] <= 100.0
        assert len(data["scores"]) == 2
        assert len(data["segments"]) >= 1
        assert data["model_info"]["model_id"] == "MelodyMachine/Deepfake-audio-detection-V2"
        assert "Wav2Vec2" in data["model_info"]["architecture"]


@pytest.mark.anyio
async def test_audio_valid_mp3_inference():
    mp3_bytes = create_dummy_mp3_bytes(duration_sec=2.0, sr=16000)
    assert len(mp3_bytes) > 0

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/analyze/audio",
            files={"file": ("voice_note.mp3", mp3_bytes, "audio/mpeg")}
        )
        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert data["filename"] == "voice_note.mp3"
        assert data["predicted_label"] in ["Real", "Fake"]
        assert data["confidence_score"] > 0
        assert len(data["segments"]) >= 1
