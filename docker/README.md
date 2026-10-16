# docker/

Everything the containers need that is not application code.

| Path | Purpose |
|---|---|
| `postgres/init/00-extensions-and-roles.sql` | `pg_stat_statements`, monitoring roles (`postgres_exporter`, read-only `grafana_ro`) |
| `postgres/init/01-schema.sql` | **All tables, enum types and indexes.** Generated from the Alembic migrations (head `ea767da8fc80`) and stamps `alembic_version`, so the `alembic upgrade head` run at API start-up is a no-op |
| `postgres/init/02-seed-admin-user.sql` | `admin@example.com` / `password123` (Argon2id hash, role `admin`) |
| `postgres/init/03-seed-demo-data.sql` | Optional demo users (teller, executive, manager, alice, bob) with profiles and funded accounts. Delete the file for a clean install |
| `postgres/init/04-observability-grants.sql` | Column-level read-only grants for Grafana's database data source |
| `pgbouncer/pgbouncer.ini`, `userlist.txt` | Transaction pooling in front of PostgreSQL (the app uses `DB_USE_PGBOUNCER=true`) |
| `redis/redis.conf` | `maxmemory 256mb` so Redis memory % is meaningful, AOF persistence |

The init scripts run **once**, when the `nextgen_local_db` volume is created. To re-run them:

```bash
docker compose -f local.yml down -v     # deletes ALL data volumes
docker compose -f local.yml up -d --build
```

Adding a new Alembic migration later keeps working: the API container runs `alembic upgrade head` on start.
