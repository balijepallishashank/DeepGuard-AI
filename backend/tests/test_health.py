import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.anyio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["api_version"] == "1.1.0"
        assert "model_ready" in data
        assert "model_name" in data
        assert "device" in data
        assert data["model_name"] == "king1oo1/deepfake-model"
