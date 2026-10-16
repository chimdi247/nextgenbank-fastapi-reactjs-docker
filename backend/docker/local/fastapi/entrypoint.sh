#!/bin/bash

set -o errexit

set -o nounset

set -o pipefail

python <<END
import sys
import time
import psycopg

MAX_WAIT_SECONDS = 30
RETRY_INTERVAL = 5
start_time = time.time()

def check_database():
  try:
    psycopg.connect(
      dbname="${POSTGRES_DB}",
      user="${POSTGRES_USER}",
      password="${POSTGRES_PASSWORD}",
      host="${POSTGRES_HOST}",
      port="${POSTGRES_PORT}",
    )
    return True
  except psycopg.OperationalError as error:
    elapsed = int(time.time() - start_time)
    sys.stderr.write(f"Database connection attempt failed after {elapsed} seconds: {error}\n")
    return False

while True:
  if check_database():
    break

  if time.time() - start_time > MAX_WAIT_SECONDS:
    sys.stderr.write("Error: Database connection could not be established after 30 seconds\n")
    sys.exit(1)

  sys.stderr.write(f"Waiting {RETRY_INTERVAL} seconds before retrying...\n")
  time.sleep(RETRY_INTERVAL)
END

echo >&2 'PostgreSQL is ready to accept connections'

# Only the API container migrates; worker / beat / flower set RUN_MIGRATIONS=false and wait for the API.
# On a fresh stack docker/postgres/init/01-schema.sql has already created the tables and stamped
# alembic_version, so this is a no-op; it still applies any migration added later.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  alembic upgrade head
fi

exec "$@"
