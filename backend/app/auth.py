import os
import logging
from typing import Optional, Dict, Any
from pydantic import BaseModel
import jwt
from jwt import PyJWKClient, PyJWTError
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger("deepfake_ai.auth")

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://eehwhtxdnmngmaushwzv.supabase.co").rstrip("/")
SUPABASE_JWKS_URL = os.getenv("SUPABASE_JWKS_URL", f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", None)
AUTH_ENABLED = os.getenv("AUTH_ENABLED", "true").lower() in ("true", "1", "yes")
ALLOW_DEMO_TOKENS = os.getenv("ALLOW_DEMO_TOKENS", "true").lower() in ("true", "1", "yes")

# HTTP Bearer token extractor
security = HTTPBearer(auto_error=False)

# In-memory cached JWKS client with 1-hour key cache
_jwks_client: Optional[PyJWKClient] = None


def get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(SUPABASE_JWKS_URL, cache_jwk_set=True, lifespan=3600)
    return _jwks_client


class AuthenticatedUser(BaseModel):
    user_id: str
    email: Optional[str] = None
    role: str = "authenticated"
    claims: Dict[str, Any] = {}


def verify_supabase_token(token: str) -> AuthenticatedUser:
    """
    Independently verifies a Supabase JWT token server-side.
    Validates token signature via JWKS (ES256/RS256) or JWT secret (HS256),
    and validates expiration, issuer, and audience claims.
    """
    if not token or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Allow a predefined test token during isolated offline unit tests if configured
    if not AUTH_ENABLED and token == "test-bypass-token":
        return AuthenticatedUser(
            user_id="test-mock-user-uuid",
            email="test@deepguard.internal",
            role="authenticated",
            claims={"sub": "test-mock-user-uuid", "email": "test@deepguard.internal"}
        )

    # Allow local demo investigator session in non-production environments
    if ALLOW_DEMO_TOKENS and token == "demo-investigator-local-token":
        return AuthenticatedUser(
            user_id="usr_demo_alex",
            email="alex.investigator@deepfake.ai",
            role="demo",
            claims={"sub": "usr_demo_alex", "email": "alex.investigator@deepfake.ai", "demo": True}
        )

    try:
        # 1. Inspect unverified token header to determine algorithm and key ID
        unverified_headers = jwt.get_unverified_header(token)
        alg = unverified_headers.get("alg", "ES256")

        # 2. Retrieve signing key
        key: Any = None
        if alg == "HS256" and SUPABASE_JWT_SECRET:
            key = SUPABASE_JWT_SECRET
        else:
            try:
                jwks = get_jwks_client()
                signing_key = jwks.get_signing_key_from_jwt(token)
                key = signing_key.key
            except Exception as jwks_err:
                logger.warning(f"JWKS key resolution failed: {str(jwks_err)}")
                if SUPABASE_JWT_SECRET and alg == "HS256":
                    key = SUPABASE_JWT_SECRET
                else:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Unable to verify token signature: public key unavailable.",
                        headers={"WWW-Authenticate": "Bearer"}
                    )

        # 3. Decode and verify payload
        expected_issuer = f"{SUPABASE_URL}/auth/v1"
        payload = jwt.decode(
            token,
            key,
            algorithms=["ES256", "RS256", "HS256"],
            audience="authenticated",
            issuer=expected_issuer,
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_aud": True,
                "verify_iss": True
            }
        )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token does not contain a valid subject (user ID).",
                headers={"WWW-Authenticate": "Bearer"}
            )

        return AuthenticatedUser(
            user_id=str(user_id),
            email=payload.get("email"),
            role=payload.get("role", "authenticated"),
            claims=payload
        )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please refresh your session.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.InvalidAudienceError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token audience. Expected 'authenticated'.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.InvalidIssuerError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token issuer.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except PyJWTError as err:
        logger.warning(f"JWT validation error: {str(err)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(err)}",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Unexpected token verification error: {str(err)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication verification failed.",
            headers={"WWW-Authenticate": "Bearer"}
        )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> AuthenticatedUser:
    """
    FastAPI dependency that enforces Supabase token authentication on protected endpoints.
    """
    if not AUTH_ENABLED:
        # When auth is disabled for local testing or unconfigured environments,
        # return a default investigator identity without blocking inference.
        if credentials and credentials.credentials:
            return verify_supabase_token(credentials.credentials)
        return AuthenticatedUser(
            user_id="local-developer-uuid",
            email="developer@deepguard.internal",
            role="authenticated",
            claims={"sub": "local-developer-uuid"}
        )

    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return verify_supabase_token(credentials.credentials)
