import asyncio

import pytest

from backend.app.core.config import settings
from backend.app.core.rate_limit.config import DEFAULT_RATE_LIMITS
from backend.app.core.rate_limit.middleware import RateLimitMiddleware

pytestmark = pytest.mark.unit


def _limit(endpoint, multiplier, monkeypatch):
    monkeypatch.setattr(settings, "RATE_LIMIT_MULTIPLIER", multiplier)
    mw = RateLimitMiddleware.__new__(RateLimitMiddleware)  # skip __init__ (it connects to Redis)
    return asyncio.run(mw._get_limit_config(endpoint))


def test_multiplier_one_keeps_configured_limit(monkeypatch):
    ep = "/api/v1/auth/login/request-otp"
    assert _limit(ep, 1, monkeypatch).max_requests == DEFAULT_RATE_LIMITS[ep].max_requests


def test_multiplier_scales_limit_and_keeps_window(monkeypatch):
    ep = "/api/v1/auth/login/request-otp"
    got = _limit(ep, 10, monkeypatch)
    assert got.max_requests == DEFAULT_RATE_LIMITS[ep].max_requests * 10
    assert got.window_seconds == DEFAULT_RATE_LIMITS[ep].window_seconds


def test_multiplier_does_not_mutate_shared_config(monkeypatch):
    ep = "/api/v1/auth/register"
    before = DEFAULT_RATE_LIMITS[ep].max_requests
    _limit(ep, 50, monkeypatch)
    assert DEFAULT_RATE_LIMITS[ep].max_requests == before
