# NextGen Bank

FastAPI banking platform (accounts, OTP-secured transfers, virtual cards, AI fraud screening) with a React + shadcn/ui
web app, PostgreSQL behind PgBouncer, Redis, RabbitMQ/Celery, and full OpenTelemetry observability in Grafana.
**One compose file runs everything.**

```bash
docker compose -f local.yml up -d --build      # first build downloads dependencies: allow 10-20 min
```

Wait until `docker compose -f local.yml ps` shows the services healthy (about 2-3 minutes after the build).

| What | URL | Login |
|---|---|---|
| **Web app** | http://localhost:8088 | `admin@example.com` / `password123` |
| API docs (Swagger) | http://localhost:8000/api/v1/docs | |
| **Mailpit** (login codes, activation & alert e-mails) | http://localhost:8025 | |
| **Grafana** | http://localhost:3000 | `admin` / `admin` |
| Prometheus | http://localhost:9090 | |
| RabbitMQ management | http://localhost:15672 | `guest` / `guest` |
| Flower (Celery) | http://localhost:5555 | `admin` / `admin` |
| MLflow | http://localhost:4000 | |
| Redis UI | http://localhost:8081 | |
| PgBouncer / PostgreSQL | `localhost:6432` / `localhost:5432` | `nextgen` / `nextgen_pw`, db `nextgen` |

**Signing in is two-step:** password, then a 6-digit code that is e-mailed. In this stack mail goes to **Mailpit**: open
http://localhost:8025 (the login screen links to it) and copy the code.

### Demo users (password `password123` for all)

| User | Role | What to try |
|---|---|---|
| `admin@example.com` | admin | customers list, train / deploy the fraud model, platform links |
| `executive@example.com` | account executive | activate new accounts & cards, review flagged transactions |
| `teller@example.com` | teller | cash deposit / withdrawal |
| `manager@example.com` | branch manager | customer profiles |
| `alice@example.com`, `bob@example.com` | customer | accounts `4200000000000001` / `...02`, security answer `Lagos` |

A full journey: register -> activate via the e-mail link -> sign in -> complete profile + next of kin -> open an account ->
(executive) activate it -> (teller) deposit -> transfer to another account (OTP) -> statement PDF -> virtual card.

## What is in the box

```
browser -> nginx (frontend :8088) -> FastAPI (api :8000) -> PgBouncer -> PostgreSQL
                                         |-> Redis (rate limiting, Celery results)
                                         '-> RabbitMQ -> Celery worker / beat (e-mail, statements, ML) -> Mailpit
                                                                      '-> MLflow (fraud model registry)
api / worker / beat --OTLP--> OpenTelemetry Collector --> Tempo (traces) | Prometheus (metrics) | Loki (logs) --> Grafana
```

| Folder | Content |
|---|---|
| `frontend/` | React 18 + Vite + Tailwind + shadcn/ui; nginx image that also proxies `/api` (same origin, cookies just work) |
| `docker/` | PostgreSQL init SQL (schema, admin user, demo data), PgBouncer and Redis config. See `docker/README.md` |
| `observability/` | collector, Prometheus, Loki, Tempo, Promtail, Grafana (datasources, 5 dashboards, alert rules, grafana.ini), Redis UI, RabbitMQ plugins, exporters' config |
| `tests/` | unit, integration, Selenium e2e, k6 smoke / load / spike / soak / stress / breakpoint. See `tests/README.md` |
| `backend/`, `migrations/` | the API (instrumented, fixed) |
| `local.yml` | the whole stack |

Traefik was removed from the local stack: nginx now fronts the UI and API, every tool has its own published port, and
Traefik's Docker provider breaks on recent Docker engines. `production.yml` was not touched.

## Observability

* **Instrumentation** - `backend/app/core/telemetry.py` sets up the OpenTelemetry SDK (OTLP exporters) once per process; for
  Celery that is after the prefork `fork` (`worker_process_init`). Auto-instrumentation: FastAPI, SQLAlchemy, Redis, Celery
  (trace context flows API -> RabbitMQ -> worker, so an OTP e-mail task shows up inside the login trace), httpx, system metrics.
* **Manual instrumentation of business logic** - `core/telemetry_business.py`: a `@traced` decorator (span + duration histogram +
  success / client_error / error counter) on deposits, withdrawals, transfers (initiate / complete), fraud analysis + review,
  statements, account / card lifecycle, OTP and registration; counters / histograms for logins, registrations, money moved,
  fraud risk scores, e-mails sent.
* **Structured logs** - loguru -> JSON on stdout **and** OpenTelemetry Logs -> Loki. Every line carries `trace_id`; in Grafana
  a log line shows **View trace in Tempo**, and a span links back to its logs and metrics.
* **Dashboards** (Grafana folder *NextGen Bank*): **Service Overview** (uptime, latency, SLI/SLO 99.5 % + p95 < 500 ms, error
  budget, successful vs failed HTTP requests, container + node CPU/memory, business KPIs from both telemetry and the database,
  logs, error traces), **PostgreSQL** (replication lag, TPS, % of max connections, active connections), **Redis** (connected
  clients, cache hit ratio, command throughput, memory %), **PgBouncer** (client connections, server connections, clients
  waiting, % of pool in use), **RabbitMQ** (messages waiting, published/s, acked/s, delivered-but-unacked).
* **Alerts** (Grafana-managed, `observability/grafana/provisioning/alerting`): container CPU > 40 %, container memory > 40 % (of the
  container limits in `local.yml`), node CPU > 40 %, node memory > 40 %, plus service down, API 5xx > 5 %, p95 > 1 s. E-mail goes
  through `grafana.ini` `[smtp]` to Mailpit (http://localhost:8025); set `SMTP_*` / `ALERT_EMAIL_TO` in your shell or a root `.env`
  to use a real SMTP server. The ML-heavy containers (API, worker) idle around 30-45 % of their memory limit, so the 40 % memory
  alert may fire; raise the limits in `local.yml` or the threshold in `alert-rules.yaml` if that is too chatty.
* The *Replication lag* panels read 0: this single-node stack has no standby. They go live if you attach one.

## Fixes and changes to the original code

* **Startup blocker:** the Alembic chain referenced a missing revision (`ee132f190ac7`, the virtual card table), so
  `alembic upgrade head` aborted. The migration was reconstructed from the model.
* **Security:** `POST /bank-account/withdraw` had **no role check** (any user could debit any account) - now teller-only.
  `POST /bank-account/create` trusted the whole request body (a customer could create an *active*, KYC-verified account with any
  balance) - sensitive fields are now ignored. Regression tests cover both.
* `Dockerfile`: `${APP_GROUP}` typo in `--chown` broke the image build; Celery worker concurrency and migrations are configurable
  (only the API migrates, so four containers no longer race on `alembic upgrade head`).
* `Settings`: environment-dependent defaults were evaluated before `ENVIRONMENT` was read, so e.g. `COOKIE_SECURE` was always `True`
  (browsers drop such cookies over http) - re-derived in a validator.
* PgBouncer-safe database engine (no prepared-statement cache, unique statement names); Alembic uses the direct connection.
* Cheap `/livez` for Docker / blackbox probes (`/health` pings Celery workers and blocks the event loop for up to a second).
* New read endpoints the UI needs: `GET /bank-account/all`, `GET /virtual-card/all` (never returns full card numbers),
  `GET /transaction/flagged`. `admin` may use the ML API and list profiles. `RATE_LIMIT_MULTIPLIER` scales the rate limits.
* The log directory not being writable no longer crashes the app.

## Known limitations

* **Not run here:** this was assembled without Docker access. Syntax and structure were validated (YAML / JSON / Python compile /
  TypeScript transpile / DDL replayed from the migrations); the first `up --build` is the real test.
* Dev-only credentials and secrets (`.envs/.env.local`, SQL files, `userlist.txt`). Change everything before real use.
* Profile / ID photo uploads need Cloudinary credentials (`CLOUDINARY_*`); the UI does not use them.
* Exporter metric names (especially PgBouncer's) vary a little between releases; if a panel is empty, search the prefix in
  Prometheus (`pgbouncer_`, `pg_custom_`, `rabbitmq_`, `span_metrics_`).
