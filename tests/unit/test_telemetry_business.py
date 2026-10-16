import asyncio
import json
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from backend.app.core import telemetry, telemetry_business as tb

pytestmark = pytest.mark.unit


class Recorder:
    def __init__(self):
        self.calls = []

    def add(self, value, attrs=None):
        self.calls.append((value, attrs))

    record = add


@pytest.fixture()
def rec(monkeypatch):
    count, duration = Recorder(), Recorder()
    monkeypatch.setattr(tb, "operation_count", count)
    monkeypatch.setattr(tb, "operation_duration", duration)
    return count, duration


def test_traced_success_returns_value_and_counts(rec):
    @tb.traced("demo.ok")
    async def ok(x):
        return x * 2

    assert asyncio.run(ok(21)) == 42
    assert rec[0].calls[-1][1] == {"operation": "demo.ok", "outcome": "success"}
    assert rec[1].calls, "duration must be recorded"


def test_http_4xx_is_a_client_error_not_an_error(rec):
    @tb.traced("demo.reject")
    async def reject():
        raise HTTPException(status_code=403, detail="no")

    with pytest.raises(HTTPException):
        asyncio.run(reject())
    assert rec[0].calls[-1][1]["outcome"] == "client_error"


def test_unexpected_exception_is_an_error_and_propagates(rec):
    @tb.traced("demo.boom")
    async def boom():
        raise RuntimeError("x")

    with pytest.raises(RuntimeError):
        asyncio.run(boom())
    assert rec[0].calls[-1][1]["outcome"] == "error"


def test_record_transaction_normalises_enum_currency(monkeypatch):
    seen = Recorder(); amounts = Recorder()
    monkeypatch.setattr(tb, "transaction_count", seen)
    monkeypatch.setattr(tb, "transaction_amount", amounts)
    tb.record_transaction("deposit", "completed", 25.5, SimpleNamespace(value="USD"))
    assert seen.calls[0][1] == {"type": "deposit", "status": "completed", "currency": "USD"}
    assert amounts.calls[0][0] == 25.5


def test_pending_transactions_do_not_record_an_amount(monkeypatch):
    seen = Recorder(); amounts = Recorder()
    monkeypatch.setattr(tb, "transaction_count", seen)
    monkeypatch.setattr(tb, "transaction_amount", amounts)
    tb.record_transaction("transfer", "pending", 100, "USD")
    assert seen.calls and not amounts.calls


def test_json_log_sink_emits_structured_line(capsys):
    record = {
        "time": datetime.now(timezone.utc), "level": SimpleNamespace(name="INFO", no=20), "name": "t", "function": "f",
        "line": 1, "message": "hello", "exception": None,
    }
    telemetry.loguru_json_sink(SimpleNamespace(record=record))
    line = json.loads(capsys.readouterr().out.strip())
    assert line["message"] == "hello" and line["level"] == "INFO"
    assert {"timestamp", "service", "trace_id", "span_id"} <= line.keys()


def test_telemetry_can_be_disabled(monkeypatch):
    monkeypatch.setenv("OTEL_SDK_DISABLED", "true")
    assert telemetry.telemetry_enabled() is False
