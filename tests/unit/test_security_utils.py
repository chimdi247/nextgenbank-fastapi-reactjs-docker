import pytest

from backend.app.auth.utils import generate_otp, generate_password_hash, verify_password

pytestmark = pytest.mark.unit


def test_password_hash_is_argon2id_and_verifies():
    h = generate_password_hash("password123")
    assert h.startswith("$argon2id$")
    assert verify_password("password123", h) is True


def test_wrong_password_is_rejected():
    assert verify_password("nope", generate_password_hash("password123")) is False


def test_hashes_are_salted():
    assert generate_password_hash("same") != generate_password_hash("same")


def test_seeded_admin_hash_verifies():
    """The hash in docker/postgres/init/02-seed-admin-user.sql must match password123."""
    import re
    from pathlib import Path

    candidates = [Path("/src/docker/postgres/init/02-seed-admin-user.sql"), Path(__file__).resolve().parents[2] / "docker/postgres/init/02-seed-admin-user.sql"]
    sql = next((p.read_text() for p in candidates if p.exists()), None)
    if sql is None:
        pytest.skip("seed file not available in this environment")
    stored = re.search(r"'(\$argon2id\$[^']+)'", sql).group(1)
    assert verify_password("password123", stored)
    assert not verify_password("password124", stored)


@pytest.mark.parametrize("length", [4, 6, 8])
def test_otp_length_and_digits(length):
    otp = generate_otp(length)
    assert len(otp) == length and otp.isdigit()
