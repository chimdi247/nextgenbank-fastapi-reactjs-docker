#!/bin/bash

set -o errexit

set -o nounset

set -o pipefail

# best effort: MLflow may still be starting
python -c "from backend.app.core.ml.cleanup import cleanup_mlflow_runs; cleanup_mlflow_runs()" || echo "mlflow cleanup skipped"

exec watchfiles --filter python celery.__main__.main --args "-A backend.app.core.celery_app worker -Q nextgen_tasks,ml_tasks -l INFO --concurrency ${CELERY_CONCURRENCY:-2}"
