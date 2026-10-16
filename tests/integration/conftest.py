import os
import uuid

import httpx
import pytest

from common.mailpit import existing_ids, wait_for_otp

API = os.getenv("API_URL", "http://localhost:8000/api/v1")
PASSWORD = "password123"


def login(email: str, password: str = PASSWORD) -> httpx.Client:
    """Two-step login (password -> e-mailed OTP). Returns a client holding the session cookies."""
    client = httpx.Client(base_url=API, timeout=30)
    seen = existing_ids(email)
    r = client.post("/auth/login/request-otp", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    otp = wait_for_otp(email, after_ids=seen)
    r = client.post("/auth/login/verify-otp", json={"email": email, "otp": otp})
    assert r.status_code == 200, r.text
    return client


@pytest.fixture(scope="session")
def admin():
    with login("admin@example.com") as c:
        yield c


@pytest.fixture(scope="session")
def teller():
    with login("teller@example.com") as c:
        yield c


@pytest.fixture(scope="session")
def alice():
    with login("alice@example.com") as c:
        yield c


@pytest.fixture(scope="session")
def executive():
    with login("executive@example.com") as c:
        yield c


def idem():
    return {"Idempotency-Key": str(uuid.uuid4())}
