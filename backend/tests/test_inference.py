import os
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.model_loader import DeepfakeDetectorService


@pytest.fixture(scope="module", autouse=True)
def initialize_model():
    """Ensure the detector model is loaded before running API tests."""
    detector = DeepfakeDetectorService.get_instance()
    detector.initialize()
    return detector


@pytest.mark.anyio
async def test_health_reports_model_ready():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["model_ready"] is True
        assert data["model_name"] == "king1oo1/deepfake-model"
        assert data["device"] == "cuda"
        assert "RTX 4050" in data["gpu_name"]


@pytest.mark.anyio
async def test_image_analysis_api_inference():
    fixture_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "fixtures", "sample_valid.png"))
    assert os.path.exists(fixture_path), f"Missing fixture: {fixture_path}"

    with open(fixture_path, "rb") as f:
        file_bytes = f.read()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/analyze/image",
            files={"file": ("sample_valid.png", file_bytes, "image/png")}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["filename"] == "sample_valid.png"
        assert data["device_used"] == "cuda"
        assert data["predicted_label"] in ["Real", "Fake"]
        assert len(data["scores"]) == 2
        assert "inference_time_ms" in data
        assert "forensic_caveat" in data
