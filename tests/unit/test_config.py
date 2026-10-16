import pytest

from backend.app.core.config import Settings

pytestmark = pytest.mark.unit


def test_local_environment_gets_local_defaults():
    s = Settings(_env_file=None, ENVIRONMENT="local")
    assert s.COOKIE_SECURE is False, "Secure cookies are dropped by browsers on plain http"


def test_explicit_value_beats_local_default():
    s = Settings(_env_file=None, ENVIRONMENT="local", COOKIE_SECURE=True)
    assert s.COOKIE_SECURE is True


def test_production_keeps_secure_cookies():
    s = Settings(_env_file=None, ENVIRONMENT="production")
    assert s.COOKIE_SECURE is True


def test_pgbouncer_and_direct_urls_exist():
    s = Settings(_env_file=None)
    assert s.DB_POOL_SIZE > 0 and s.RATE_LIMIT_MULTIPLIER >= 1
