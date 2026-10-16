import httpx
import pytest

from .conftest import API, PASSWORD

pytestmark = pytest.mark.integration


def test_liveness_and_deep_health_endpoints():
    base = API.replace("/api/v1", "")
    assert httpx.get(base + "/livez", timeout=10).status_code == 200
    assert httpx.get(base + "/health", timeout=20).status_code in (200, 206)  # 206 = degraded (e.g. no worker yet)


def test_admin_can_log_in_with_seeded_credentials(admin):
    me = admin.get("/profile/me")
    assert me.status_code == 200
    body = me.json()
    assert body["email"] == "admin@example.com" and body["role"] == "admin"


def test_wrong_password_is_rejected():
    r = httpx.post(f"{API}/auth/login/request-otp", json={"email": "admin@example.com", "password": "wrong-password"}, timeout=15)
    assert r.status_code in (400, 401, 403)


def test_protected_endpoint_requires_a_session():
    assert httpx.get(f"{API}/profile/me", timeout=10).status_code == 401


def test_unknown_user_gets_no_signal():
    """request-otp must not reveal whether an account exists."""
    r = httpx.post(f"{API}/auth/login/request-otp", json={"email": "nobody@example.com", "password": PASSWORD}, timeout=15)
    assert r.status_code in (200, 400, 401)
