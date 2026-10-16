"""Manual instrumentation of the bank's business logic.

Uses the OpenTelemetry *API* only (a no-op until `setup_telemetry()` installs the SDK), so importing this
module is always safe - including in unit tests.

Prometheus names (after the collector's OTLP -> Prometheus conversion):
  bank_operations_total{operation,outcome}            bank_operation_duration_seconds_(bucket|sum|count)
  bank_logins_total{result}                           bank_registrations_total
  bank_transactions_total{type,status,currency}       bank_transaction_amount_(bucket|sum|count){type,currency}
  bank_fraud_checks_total{decision}                   bank_fraud_risk_score_(bucket|sum|count)
  bank_accounts_total{event}                          bank_cards_total{event}
  bank_emails_total{result}
"""

from __future__ import annotations

import time
from functools import wraps
from typing import Any, Awaitable, Callable, TypeVar

from fastapi import HTTPException
from opentelemetry import metrics, trace
from opentelemetry.trace import Status, StatusCode

F = TypeVar("F", bound=Callable[..., Awaitable[Any]])

tracer = trace.get_tracer("nextgen.business")
meter = metrics.get_meter("nextgen.business")

operation_count = meter.create_counter(
    "bank.operations", description="Business operations by outcome"
)
operation_duration = meter.create_histogram(
    "bank.operation.duration", unit="s", description="Business operation duration"
)
login_count = meter.create_counter("bank.logins", description="Login steps by result")
registration_count = meter.create_counter(
    "bank.registrations", description="Accounts registered"
)
transaction_count = meter.create_counter(
    "bank.transactions", description="Money movements by type and status"
)
transaction_amount = meter.create_histogram(
    "bank.transaction.amount", description="Money movement size"
)
fraud_checks = meter.create_counter(
    "bank.fraud.checks", description="Fraud analyses by decision"
)
fraud_score = meter.create_histogram(
    "bank.fraud.risk_score", description="Fraud risk score (0-1)"
)
account_events = meter.create_counter(
    "bank.accounts", description="Bank account lifecycle events"
)
card_events = meter.create_counter(
    "bank.cards", description="Virtual card lifecycle events"
)
email_count = meter.create_counter("bank.emails", description="E-mails sent by workers")


def traced(operation: str, **static_attributes: Any) -> Callable[[F], F]:
    """Decorator for async service functions: span + duration histogram + outcome counter.

    outcome = success | client_error (4xx HTTPException, expected business rejection) | error (5xx / crash)
    """

    def decorator(fn: F) -> F:
        @wraps(fn)
        async def wrapper(*args: Any, **kwargs: Any):
            start = time.perf_counter()
            outcome = "success"
            with tracer.start_as_current_span(
                f"bank.{operation}", attributes=dict(static_attributes)
            ) as span:
                try:
                    return await fn(*args, **kwargs)
                except HTTPException as exc:
                    span.set_attribute("http.response.status_code", exc.status_code)
                    if exc.status_code >= 500:
                        outcome = "error"
                        span.record_exception(exc)
                        span.set_status(Status(StatusCode.ERROR, str(exc.detail)))
                    else:
                        outcome = "client_error"
                    raise
                except Exception as exc:
                    outcome = "error"
                    span.record_exception(exc)
                    span.set_status(Status(StatusCode.ERROR, str(exc)))
                    raise
                finally:
                    attrs = {"operation": operation, "outcome": outcome}
                    operation_count.add(1, attrs)
                    operation_duration.record(time.perf_counter() - start, attrs)

        return wrapper  # type: ignore[return-value]

    return decorator


def record_login(result: str) -> None:
    """result: otp_sent | bad_password | unknown_user | not_activated | success | bad_otp | locked"""
    login_count.add(1, {"result": result})


def record_registration() -> None:
    registration_count.add(1)


def record_transaction(
    kind: str, status: str, amount: float | None = None, currency: str = "n/a"
) -> None:
    """kind: deposit | withdrawal | transfer | card_topup. status: completed | pending | failed | flagged"""
    currency = str(getattr(currency, "value", currency))
    transaction_count.add(1, {"type": kind, "status": status, "currency": currency})
    if amount is not None and status == "completed":
        transaction_amount.record(float(amount), {"type": kind, "currency": currency})


def record_fraud_check(score: float, flagged: bool) -> None:
    fraud_checks.add(1, {"decision": "flagged" if flagged else "cleared"})
    fraud_score.record(float(score))
    span = trace.get_current_span()
    if span.is_recording():
        span.set_attribute("bank.fraud.risk_score", float(score))
        span.set_attribute("bank.fraud.flagged", flagged)


def record_account_event(event: str) -> None:
    account_events.add(1, {"event": event})


def record_card_event(event: str) -> None:
    card_events.add(1, {"event": event})


def record_email(result: str) -> None:
    email_count.add(1, {"result": result})
