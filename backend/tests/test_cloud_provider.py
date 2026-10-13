import pytest
from unittest.mock import patch, AsyncMock
import httpx
from app.cloud_provider import CloudInferenceService, CloudInferenceResult
from app.config import config


@pytest.mark.anyio
async def test_cloud_disabled_returns_fallback():
    service = CloudInferenceService.get_instance()
    with patch.object(config, "cloud_inference_enabled", False):
        res = await service.predict_image(b"dummy_bytes")
        assert not res.success
        assert res.fallback_used
        assert res.status == "DISABLED"


@pytest.mark.anyio
async def test_cloud_402_payment_required_handled_gracefully():
    service = CloudInferenceService.get_instance()
    mock_response = httpx.Response(
        status_code=402,
        json={"error": "You have no remaining credits. Purchase pre-paid credits to continue."},
        request=httpx.Request("POST", "https://example.com")
    )
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        with patch.object(config, "cloud_inference_enabled", True), \
             patch.object(config, "_hf_token", "hf_mock_token_for_test_1234567"):
            res = await service.predict_image(b"dummy_bytes")
            assert not res.success
            assert res.fallback_used
            assert res.status == "PAYMENT_REQUIRED"
            assert "pre-paid credits" in res.error_message


@pytest.mark.anyio
async def test_cloud_401_unauthorized_handled_gracefully():
    service = CloudInferenceService.get_instance()
    mock_response = httpx.Response(
        status_code=401,
        json={"error": "Invalid token"},
        request=httpx.Request("POST", "https://example.com")
    )
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        with patch.object(config, "cloud_inference_enabled", True), \
             patch.object(config, "_hf_token", "hf_mock_token_for_test_1234567"):
            res = await service.predict_image(b"dummy_bytes")
            assert not res.success
            assert res.fallback_used
            assert res.status == "UNAUTHORIZED"


@pytest.mark.anyio
async def test_cloud_429_rate_limit_handled_gracefully():
    service = CloudInferenceService.get_instance()
    mock_response = httpx.Response(
        status_code=429,
        json={"error": "Rate limit reached"},
        request=httpx.Request("POST", "https://example.com")
    )
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        with patch.object(config, "cloud_inference_enabled", True), \
             patch.object(config, "_hf_token", "hf_mock_token_for_test_1234567"):
            res = await service.predict_image(b"dummy_bytes")
            assert not res.success
            assert res.fallback_used
            assert res.status == "RATE_LIMITED"


@pytest.mark.anyio
async def test_cloud_timeout_handled_gracefully():
    service = CloudInferenceService.get_instance()
    with patch("httpx.AsyncClient.post", side_effect=httpx.TimeoutException("Connection timed out")):
        with patch.object(config, "cloud_inference_enabled", True), \
             patch.object(config, "_hf_token", "hf_mock_token_for_test_1234567"):
            res = await service.predict_image(b"dummy_bytes")
            assert not res.success
            assert res.fallback_used
            assert res.status == "TIMEOUT"


@pytest.mark.anyio
async def test_cloud_success_normalizes_labels():
    service = CloudInferenceService.get_instance()
    mock_response = httpx.Response(
        status_code=200,
        json=[
            {"label": "artificial", "score": 0.9421},
            {"label": "human", "score": 0.0579}
        ],
        request=httpx.Request("POST", "https://example.com")
    )
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        with patch.object(config, "cloud_inference_enabled", True), \
             patch.object(config, "_hf_token", "hf_mock_token_for_test_1234567"):
            res = await service.predict_image(b"dummy_bytes")
            assert res.success
            assert not res.fallback_used
            assert res.predicted_label == "Fake"
            assert res.confidence_score == 0.9421
            assert res.fake_probability == 0.9421
            assert any(s["label"] == "Fake" for s in res.raw_scores)


@pytest.mark.anyio
async def test_cloud_ambiguous_score_yields_inconclusive():
    service = CloudInferenceService.get_instance()
    mock_response = httpx.Response(
        status_code=200,
        json=[
            {"label": "artificial", "score": 0.521},
            {"label": "human", "score": 0.479}
        ],
        request=httpx.Request("POST", "https://example.com")
    )
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        with patch.object(config, "cloud_inference_enabled", True), \
             patch.object(config, "_hf_token", "hf_mock_token_for_test_1234567"):
            res = await service.predict_image(b"dummy_bytes")
            assert res.success
            assert res.predicted_label == "Inconclusive"
            assert res.confidence_score == 0.521
