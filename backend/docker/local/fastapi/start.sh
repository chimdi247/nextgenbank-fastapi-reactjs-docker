#!/bin/bash

set -o errexit

set -o nounset

set -o pipefail

# --reload is opt-in (UVICORN_RELOAD=true): it re-forks the process and fights with OpenTelemetry's exporters.
RELOAD_FLAG=""
if [ "${UVICORN_RELOAD:-false}" = "true" ]; then
  RELOAD_FLAG="--reload"
fi

# --proxy-headers: the app sits behind nginx, so the rate limiter must see the real client IP
exec uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 \
  --proxy-headers --forwarded-allow-ips='*' ${RELOAD_FLAG}
