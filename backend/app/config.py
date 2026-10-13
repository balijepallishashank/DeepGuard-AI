import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Locate backend root and project root
BACKEND_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_ROOT.parent

# Load environment variables: prefer backend/.env, fallback to project root .env
backend_env = BACKEND_ROOT / ".env"
project_env = PROJECT_ROOT / ".env"

if backend_env.exists():
    load_dotenv(backend_env)
elif project_env.exists():
    load_dotenv(project_env)


class BackendConfig:
    """
    Centralized configuration for DeepGuard AI Backend.
    Strictly prevents leaking API keys or secrets in string representations.
    """
    def __init__(self):
        self._hf_token: str = os.getenv("HF_TOKEN", "").strip()
        self.cloud_inference_enabled: bool = os.getenv("CLOUD_INFERENCE_ENABLED", "false").lower() in ("true", "1", "yes")
        self.supabase_url: str = os.getenv("SUPABASE_URL", "https://eehwhtxdnmngmaushwzv.supabase.co").strip()
        self.primary_cloud_model: str = "umm-maybe/AI-image-detector"
        self.secondary_cloud_model: str = "Organika/sdxl-detector"
        self.hf_inference_router_url: str = "https://router.huggingface.co/hf-inference/models"

    @property
    def has_hf_token(self) -> bool:
        """Returns True if a non-placeholder HF_TOKEN is configured."""
        return bool(self._hf_token and not self._hf_token.startswith("hf_your_") and len(self._hf_token) > 10)

    @property
    def hf_token(self) -> str:
        """Access token strictly for server-side HTTP headers."""
        return self._hf_token

    @property
    def is_cloud_inference_active(self) -> bool:
        """True only if feature flag is enabled AND a valid token is present."""
        return self.cloud_inference_enabled and self.has_hf_token

    def __repr__(self) -> str:
        return (
            f"<BackendConfig cloud_enabled={self.cloud_inference_enabled} "
            f"token_configured={self.has_hf_token} "
            f"primary_cloud_model={self.primary_cloud_model}>"
        )

    def __str__(self) -> str:
        return self.__repr__()


# Singleton configuration instance
config = BackendConfig()
