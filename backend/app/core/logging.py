import os

from loguru import logger

from backend.app.core.config import settings
from backend.app.core.telemetry import loguru_json_sink, loguru_otel_sink

logger.remove()

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")

LOG_FORMAT = (
    "{time:YYYY-MM-DD HH:mm:ss.SSS} | "
    "{level: <8} | "
    "{name}:{function}:{line} - "
    "{message}"
)

LOG_LEVEL = "DEBUG" if settings.ENVIRONMENT == "local" else "INFO"

# 1) Structured JSON on stdout: `docker compose logs api`, includes trace_id / span_id
logger.add(loguru_json_sink, level=LOG_LEVEL, format="{message}")

# 2) OpenTelemetry Logs (-> collector -> Loki). Inactive until setup_telemetry() has run.
logger.add(loguru_otel_sink, level=LOG_LEVEL, format="{message}")

# 3) Rotating files (kept from the original setup). A read-only / foreign-owned log directory must not
#    stop the application from booting, so file sinks are optional.
try:
    os.makedirs(LOG_DIR, exist_ok=True)
    if os.access(LOG_DIR, os.W_OK):
        logger.add(
            sink=os.path.join(LOG_DIR, "debug.log"),
            format=LOG_FORMAT,
            level=LOG_LEVEL,
            filter=lambda record: record["level"].no <= logger.level("WARNING").no,
            rotation="10MB",
            retention="30 days",
            compression="zip",
        )

        logger.add(
            sink=os.path.join(LOG_DIR, "error.log"),
            format=LOG_FORMAT,
            level="ERROR",
            rotation="10MB",
            retention="30 days",
            compression="zip",
            backtrace=True,
            diagnose=True,
        )
except OSError:
    pass


def get_logger():
    return logger
