"""Read e-mails from Mailpit (the stack's SMTP sink) - the only way to obtain login / transfer OTP codes."""
import os
import re
import time

import httpx

MAILPIT_URL = os.getenv("MAILPIT_URL", "http://localhost:8025")


def _messages(to: str) -> list[dict]:
    r = httpx.get(f"{MAILPIT_URL}/api/v1/search", params={"query": f"to:{to}", "limit": 20}, timeout=10)
    r.raise_for_status()
    return r.json().get("messages", [])


def clear_inbox(to: str | None = None) -> None:
    if to:
        httpx.delete(f"{MAILPIT_URL}/api/v1/search", params={"query": f"to:{to}"}, timeout=10)
    else:
        httpx.delete(f"{MAILPIT_URL}/api/v1/messages", timeout=10)


def wait_for_otp(to: str, subject_contains: str | None = None, timeout: float = 45.0, after_ids: set[str] | None = None) -> str:
    """Poll Mailpit until a message with a 6-digit code arrives for `to`; returns the code."""
    after_ids = after_ids or set()
    deadline = time.time() + timeout
    while time.time() < deadline:
        for m in _messages(to):
            if m["ID"] in after_ids:
                continue
            if subject_contains and subject_contains.lower() not in m.get("Subject", "").lower():
                continue
            body = httpx.get(f"{MAILPIT_URL}/api/v1/message/{m['ID']}", timeout=10).json()
            text = (body.get("Text") or "") + " " + (body.get("HTML") or "")
            found = re.findall(r"(?<!\d)(\d{6})(?!\d)", re.sub(r"<[^>]+>", " ", text))
            if found:
                return found[0]
        time.sleep(1)
    raise TimeoutError(f"no OTP e-mail for {to} within {timeout}s")


def existing_ids(to: str) -> set[str]:
    return {m["ID"] for m in _messages(to)}
