import pytest
import app.auth


@pytest.fixture(autouse=True)
def default_test_auth_env(monkeypatch):
    """
    By default for unit test suites (video, audio, image models, validation),
    run with AUTH_ENABLED=false so pure media algorithms and validation logic
    are tested independently of third-party network auth.
    
    Dedicated auth and security tests in test_auth.py explicitly override this
    with AUTH_ENABLED=true to rigorously test 401 rejection and token verification.
    """
    monkeypatch.setenv("AUTH_ENABLED", "false")
    monkeypatch.setattr(app.auth, "AUTH_ENABLED", False)
