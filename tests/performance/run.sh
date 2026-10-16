#!/usr/bin/env bash
# ./tests/performance/run.sh smoke|load|stress|spike|soak|breakpoint [extra k6 args]
# Streams metrics to Prometheus too (watch them in Grafana while the test runs).
set -euo pipefail
cd "$(dirname "$0")/../.."
T="${1:-smoke}"; shift || true
docker compose -f local.yml --profile tests run --rm k6 run -o experimental-prometheus-rw --tag testid="$T-$(date +%s)" "$@" "/scripts/${T}.js"
