import time
import pytest
import jwt
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.auth import verify_supabase_token, AuthenticatedUser, SUPABASE_URL


TEST_SECRET = "test-very-secure-jwt-secret-key-32chars!"


@pytest.fixture(autouse=True)
def configure_test_auth_env(monkeypatch):
    """Ensure test environment has SUPABASE_JWT_SECRET configured for symmetric testing."""
    monkeypatch.setenv("SUPABASE_JWT_SECRET", TEST_SECRET)
    monkeypatch.setenv("AUTH_ENABLED", "true")
    # Re-import to ensure module sees updated environment
    import app.auth
    monkeypatch.setattr(app.auth, "SUPABASE_JWT_SECRET", TEST_SECRET)
    monkeypatch.setattr(app.auth, "AUTH_ENABLED", True)


def create_test_token(
    sub: str = "d290f1ee-6c54-4b01-90e6-d701748f0851",
    email: str = "investigator@deepguard.ai",
    role: str = "authenticated",
    aud: str = "authenticated",
    iss: str = f"{SUPABASE_URL}/auth/v1",
    exp_delta: int = 3600,
    secret: str = TEST_SECRET,
    algorithm: str = "HS256"
) -> str:
    """Helper to synthesize valid or invalid Supabase JWT tokens for test cases."""
    now = int(time.time())
    payload = {
        "sub": sub,
        "email": email,
        "role": role,
        "aud": aud,
        "iss": iss,
        "iat": now,
        "exp": now + exp_delta,
        "user_metadata": {"full_name": "Test Investigator"}
    }
    return jwt.encode(payload, secret, algorithm=algorithm)


@pytest.mark.anyio
async def test_health_endpoint_is_public():
    """Verify that /health remains publicly accessible without any Authorization header."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ("ok", "degraded")
        assert "model_ready" in data


@pytest.mark.anyio
async def test_protected_routes_reject_missing_token():
    """Verify that all protected routes return 401 when no token is supplied."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Auth profile check
        res_me = await client.get("/api/v1/auth/me")
        assert res_me.status_code == 401
        assert "authentication required" in res_me.json()["detail"].lower()

        # Image analysis
        res_img = await client.post("/api/v1/analyze/image")
        assert res_img.status_code == 401

        # Video analysis
        res_vid = await client.post("/api/v1/analyze/video")
        assert res_vid.status_code == 401

        # Audio analysis
        res_aud = await client.post("/api/v1/analyze/audio")
        assert res_aud.status_code == 401


@pytest.mark.anyio
async def test_protected_routes_reject_invalid_token():
    """Verify that forged or malformed tokens are rejected with 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = {"Authorization": "Bearer forged.invalid.token"}
        response = await client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 401


@pytest.mark.anyio
async def test_protected_routes_reject_expired_token():
    """Verify that expired tokens are rejected with 401."""
    expired_token = create_test_token(exp_delta=-60)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {expired_token}"}
        response = await client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 401
        assert "expired" in response.json()["detail"].lower()


@pytest.mark.anyio
async def test_protected_routes_reject_wrong_audience():
    """Verify that tokens with wrong audience are rejected with 401."""
    bad_aud_token = create_test_token(aud="unauthenticated_client")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {bad_aud_token}"}
        response = await client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 401
        assert "audience" in response.json()["detail"].lower()


@pytest.mark.anyio
async def test_protected_routes_accept_valid_token():
    """Verify that a valid token grants access and returns verified claims."""
    user_uuid = "d290f1ee-6c54-4b01-90e6-d701748f0851"
    user_email = "investigator@deepguard.ai"
    valid_token = create_test_token(sub=user_uuid, email=user_email)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {valid_token}"}
        response = await client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == user_uuid
        assert data["email"] == user_email
        assert data["role"] == "authenticated"


@pytest.mark.anyio
async def test_verify_supabase_token_extracts_claims():
    """Direct unit test of verify_supabase_token helper."""
    user_uuid = "e7498c11-9f23-41bb-b567-27a188f61530"
    token = create_test_token(sub=user_uuid, email="specialist@deepguard.ai", role="authenticated")

    user: AuthenticatedUser = verify_supabase_token(token)
    assert user.user_id == user_uuid
    assert user.email == "specialist@deepguard.ai"
    assert user.role == "authenticated"
    assert "user_metadata" in user.claims
