-- Runs once, when the postgres data volume is created (docker-entrypoint-initdb.d, alphabetical order).
-- Dev-only credentials: change them for anything other than a laptop.

-- Query statistics for the Postgres dashboards / slow-query alerts.
-- (the container is started with shared_preload_libraries=pg_stat_statements, see local.yml)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- postgres_exporter: read-only monitoring role (pg_monitor = pg_read_all_stats + pg_read_all_settings + ...)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'postgres_exporter') THEN
        CREATE ROLE postgres_exporter LOGIN PASSWORD 'exporter_pw';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'grafana_ro') THEN
        CREATE ROLE grafana_ro LOGIN PASSWORD 'grafana_ro_pw';
    END IF;
END
$$;
GRANT pg_monitor TO postgres_exporter;
