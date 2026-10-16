#!/bin/sh
# Runs before nginx starts (docker-entrypoint.d): renders /config.js from the container environment.
set -eu
: "${MAILPIT_URL:=http://localhost:8025}" "${GRAFANA_URL:=http://localhost:3000}" "${PROMETHEUS_URL:=http://localhost:9090}"
: "${RABBITMQ_URL:=http://localhost:15672}" "${FLOWER_URL:=http://localhost:5555}" "${MLFLOW_URL:=http://localhost:4000}"
: "${REDIS_UI_URL:=http://localhost:8081}" "${API_DOCS_URL:=http://localhost:8000/api/v1/docs}"
export MAILPIT_URL GRAFANA_URL PROMETHEUS_URL RABBITMQ_URL FLOWER_URL MLFLOW_URL REDIS_UI_URL API_DOCS_URL
envsubst < /etc/nextgen/config.js.template > /usr/share/nginx/html/config.js
