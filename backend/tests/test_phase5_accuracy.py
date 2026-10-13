import os
import pytest
from httpx import ASGITransport, AsyncClient
from PIL import Image

from app.main import app
from app.model_loader import DeepfakeDetectorService

@pytest.mark.anyio
async def test_health_reports_candidate_telemetry():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "candidate_model_ready" in data["details"]
        assert "active_engine" in data["details"]
        assert data["details"]["candidate_model_ready"] is True
        assert data["details"]["active_engine"] == "candidate"

@pytest.mark.anyio
async def test_image_predict_candidate_with_fallback():
    detector = DeepfakeDetectorService.get_instance()
    assert detector.is_ready is True
    assert detector.candidate_ready is True

    # Test candidate inference
    img = Image.new("RGB", (224, 224), color=(73, 109, 137))
    pred = detector.predict(img, use_candidate=True)
    assert "predicted_label" in pred
    assert pred["predicted_label"] in ["Real", "Fake", "Inconclusive"]
    assert "verdict_status" in pred
    assert pred["model_info"]["active_engine"] == "candidate"

    # Test safe baseline fallback
    pred_fallback = detector.predict(img, use_candidate=False)
    assert pred_fallback["predicted_label"] in ["Real", "Fake", "Inconclusive"]
    assert pred_fallback["model_info"]["fallback_used"] is True

@pytest.mark.anyio
async def test_video_endpoint_includes_frame_based_methodology_labels():
    fixture_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "fixtures", "sample_valid.mp4"))
    if not os.path.exists(fixture_path):
        pytest.skip("sample_valid.mp4 fixture not found")

    with open(fixture_path, "rb") as f:
        vid_bytes = f.read()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/analyze/video",
            files={"file": ("sample_valid.mp4", vid_bytes, "video/mp4")}
        )
        assert response.status_code == 200
        data = response.json()
        assert "Frame-Sampled Spatial Keyframe Analysis" in data["analysis_type"]
        assert "lacks validated 3D temporal" in data["methodology_disclaimer"]
        assert data["video_classification"] in [
            "Likely Authentic Video",
            "Likely AI-Generated Video",
            "Inconclusive / Ambiguous Video Evidence"
        ]

@pytest.mark.anyio
async def test_audio_endpoint_includes_authenticity_caveats():
    import io, numpy as np, soundfile as sf
    t = np.linspace(0, 1.0, 16000, endpoint=False)
    waveform = (0.5 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)
    buf = io.BytesIO()
    sf.write(buf, waveform, 16000, format="WAV")
    wav_bytes = buf.getvalue()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/analyze/audio",
            files={"file": ("tone.wav", wav_bytes, "audio/wav")}
        )
        assert response.status_code == 200
        data = response.json()
        assert "authenticity_caveat" in data
        assert "not constitute verified proof" in data["authenticity_caveat"].lower()
        assert data["acoustic_index_label"] == "Exploratory Spectral Anomaly Index"
