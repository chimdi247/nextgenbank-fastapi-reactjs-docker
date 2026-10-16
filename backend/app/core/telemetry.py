"""OpenTelemetry bootstrap shared by the API, Celery workers and Celery beat.

    traces  --OTLP/gRPC--> otel-collector --> Tempo         (Grafana > Explore > Tempo)
    metrics --OTLP/gRPC--> otel-collector --> Prometheus    (Grafana dashboards, alerts)
    logs    --OTLP/gRPC--> otel-collector --> Loki          (log line -> trace link in Grafana)

Everything is configured through the standard OTEL_* environment variables
(OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_TRACES_SAMPLER, OTEL_RESOURCE_ATTRIBUTES, ...).

Design rules:
* Observability must never take the bank down: every step is wrapped, failures are logged and ignored.
* Call `setup_telemetry()` once per *process*. For Celery's prefork pool that means after the fork
  (see celery_app.py) because gRPC channels and exporter threads do not survive os.fork().
"""

from __future__ import annotations

import logging
import os
import sys
from typing import Any

_initialised = False
_service_name = "nextgen-api"

# Standard-library logger that carries loguru records into the OTel Logs SDK
_otel_bridge = logging.getLogger("nextgen.otel")
_otel_bridge.propagate = False
_otel_bridge.setLevel(logging.DEBUG)


def _log(msg: str) -> None:
    sys.stderr.write(f"[telemetry] {msg}\n")


def telemetry_enabled() -> bool:
    return os.getenv("OTEL_SDK_DISABLED", "false").lower() != "true" and (
        os.getenv("OTEL_ENABLED", "true").lower() == "true"
    )


def setup_telemetry(service_name: str | None = None, app: Any = None) -> bool:
    """Initialise tracing, metrics, logging bridge and library auto-instrumentation."""
    global _initialised, _service_name

    if _initialised or not telemetry_enabled():
        if app is not None and _initialised:
            _instrument_fastapi(app)
        return _initialised

    from backend.app.core.config import settings

    _service_name = service_name or os.getenv("OTEL_SERVICE_NAME", "nextgen-api")

    try:
        from opentelemetry import metrics, trace
        from opentelemetry._logs import set_logger_provider
        from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
        from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import (
            OTLPMetricExporter,
        )
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
            OTLPSpanExporter,
        )
        from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
        from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
        from opentelemetry.sdk.metrics import MeterProvider
        from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
        from opentelemetry.sdk.metrics.view import (
            ExplicitBucketHistogramAggregation,
            View,
        )
        from opentelemetry.sdk.resources import (
            SERVICE_NAME,
            SERVICE_VERSION,
            Resource,
        )
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor

        endpoint = os.getenv(
            "OTEL_EXPORTER_OTLP_ENDPOINT", settings.OTEL_EXPORTER_OTLP_ENDPOINT
        )
        resource = Resource.create(
            {
                SERVICE_NAME: _service_name,
                SERVICE_VERSION: settings.APP_VERSION,
                "service.namespace": settings.OTEL_SERVICE_NAMESPACE,
                "deployment.environment": settings.ENVIRONMENT,
            }
        )

        # ── traces ───────────────────────────────────────────────────────────
        tracer_provider = TracerProvider(resource=resource)  # sampler from OTEL_TRACES_SAMPLER
        tracer_provider.add_span_processor(
            BatchSpanProcessor(OTLPSpanExporter(endpoint=endpoint))
        )
        trace.set_tracer_provider(tracer_provider)

        # ── metrics ──────────────────────────────────────────────────────────
        reader = PeriodicExportingMetricReader(
            OTLPMetricExporter(endpoint=endpoint),
            export_interval_millis=int(os.getenv("OTEL_METRIC_EXPORT_INTERVAL", "15000")),
        )
        views = [
            View(
                instrument_name="bank.operation.duration",
                aggregation=ExplicitBucketHistogramAggregation(
                    [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
                ),
            ),
            View(
                instrument_name="bank.transaction.amount",
                aggregation=ExplicitBucketHistogramAggregation(
                    [10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000]
                ),
            ),
            View(
                instrument_name="bank.fraud.risk_score",
                aggregation=ExplicitBucketHistogramAggregation(
                    [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
                ),
            ),
        ]
        metrics.set_meter_provider(
            MeterProvider(resource=resource, metric_readers=[reader], views=views)
        )

        # ── logs ─────────────────────────────────────────────────────────────
        logger_provider = LoggerProvider(resource=resource)
        logger_provider.add_log_record_processor(
            BatchLogRecordProcessor(OTLPLogExporter(endpoint=endpoint))
        )
        set_logger_provider(logger_provider)
        for h in list(_otel_bridge.handlers):
            _otel_bridge.removeHandler(h)
        _otel_bridge.addHandler(
            LoggingHandler(level=logging.NOTSET, logger_provider=logger_provider)
        )

        _initialised = True
        _log(f"{_service_name}: exporting to {endpoint}")
    except Exception as exc:  # pragma: no cover - fail open
        _log(f"{_service_name}: SDK setup failed, continuing without telemetry: {exc}")
        return False

    _instrument_libraries()
    if app is not None:
        _instrument_fastapi(app)
    return True


def _instrument_libraries() -> None:
    """Auto-instrumentation of the libraries the bank uses."""
    steps: list[tuple[str, Any]] = []

    def redis():
        from opentelemetry.instrumentation.redis import RedisInstrumentor

        RedisInstrumentor().instrument()

    def celery():
        from opentelemetry.instrumentation.celery import CeleryInstrumentor

        CeleryInstrumentor().instrument()

    def httpx():
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

        HTTPXClientInstrumentor().instrument()

    def sqlalchemy():
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

        from backend.app.core.db import engine

        SQLAlchemyInstrumentor().instrument(engine=engine.sync_engine)

    def system_metrics():
        from opentelemetry.instrumentation.system_metrics import (
            SystemMetricsInstrumentor,
        )

        SystemMetricsInstrumentor().instrument()

    def stdlib_logging():
        # adds otelTraceID / otelSpanID to stdlib log records (uvicorn, celery, sqlalchemy ...)
        from opentelemetry.instrumentation.logging import LoggingInstrumentor

        LoggingInstrumentor().instrument(set_logging_format=False)

    steps = [
        ("redis", redis),
        ("celery", celery),
        ("httpx", httpx),
        ("sqlalchemy", sqlalchemy),
        ("system-metrics", system_metrics),
        ("logging", stdlib_logging),
    ]
    for name, fn in steps:
        try:
            fn()
        except Exception as exc:  # pragma: no cover
            _log(f"{_service_name}: instrumentation '{name}' skipped: {exc}")


def _instrument_fastapi(app: Any) -> None:
    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

        if getattr(app, "_otel_instrumented", False):
            return
        FastAPIInstrumentor.instrument_app(
            app,
            # health probes every few seconds would drown real traffic
            excluded_urls="/health,/livez",
            # drop the noisy ASGI "http send / http receive" child spans
            exclude_spans=["receive", "send"],
        )
        app._otel_instrumented = True
    except Exception as exc:  # pragma: no cover
        _log(f"{_service_name}: FastAPI instrumentation skipped: {exc}")


def loguru_otel_sink(message: Any) -> None:
    """loguru sink -> OpenTelemetry Logs. Trace/span ids are attached by the OTel LoggingHandler from
    the span that is active when the line is logged, so logs and traces correlate automatically."""
    if not _initialised:
        return
    try:
        record = message.record
        exc = record["exception"]
        exc_info = (exc.type, exc.value, exc.traceback) if exc else None
        _otel_bridge.log(
            record["level"].no,
            record["message"],
            exc_info=exc_info,
            extra={
                "code.function": record["function"],
                "code.lineno": record["line"],
                "log.logger": record["name"],
                "service.component": _service_name,
            },
        )
    except Exception:  # pragma: no cover - never break logging
        pass


def loguru_json_sink(message: Any) -> None:
    """Compact JSON line on stdout (for `docker compose logs`) including the active trace id."""
    import json
    from datetime import timezone

    record = message.record
    trace_id = span_id = ""
    try:
        from opentelemetry import trace

        ctx = trace.get_current_span().get_span_context()
        if ctx and ctx.is_valid:
            trace_id, span_id = f"{ctx.trace_id:032x}", f"{ctx.span_id:016x}"
    except Exception:
        pass
    payload = {
        "timestamp": record["time"].astimezone(timezone.utc).isoformat(),
        "level": record["level"].name,
        "service": _service_name,
        "logger": record["name"],
        "function": record["function"],
        "line": record["line"],
        "message": record["message"],
        "trace_id": trace_id,
        "span_id": span_id,
    }
    if record["exception"]:
        payload["exception"] = str(record["exception"].value)
    sys.stdout.write(json.dumps(payload, default=str) + "\n")
    sys.stdout.flush()
