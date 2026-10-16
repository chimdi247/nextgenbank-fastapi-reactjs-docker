# tests/

| Folder | Kind | Runs | Needs |
|---|---|---|---|
| `unit/` | pytest, pure python (password hashing, Luhn / account numbers, config, rate-limit multiplier, telemetry helpers, seed hash) | inside the **API image** | nothing else |
| `integration/` | pytest + httpx against the live API: 2-step login via Mailpit, RBAC regressions, idempotent deposits, OTP-confirmed transfer, history | `integration-tests` container | stack up |
| `e2e/` | pytest + **Selenium** (remote Chrome) driving the real web UI | `e2e-tests` + `selenium` containers | stack up |
| `performance/` | **k6**: `smoke`, `load`, `stress`, `spike`, `soak`, `breakpoint` | `k6` container | stack up |

```bash
# stack first
docker compose -f local.yml up -d --build

make test-unit            # docker compose -f local.yml --profile tests run --rm unit-tests
make test-integration
make test-e2e             # watch the browser: http://localhost:7900 (password: secret)

make perf-smoke           # ./tests/performance/run.sh smoke
./tests/performance/run.sh load
./tests/performance/run.sh soak -e SOAK_DURATION=30m
```

## Notes

* Login uses an e-mailed OTP. The helpers read it back through the **Mailpit API** (`common/mailpit.py`, `performance/lib.js`).
* Integration tests change balances of the demo accounts (alice / bob). Reset with `docker compose -f local.yml down -v && up -d`.
* `RATE_LIMIT_MULTIPLIER=20` in `.envs/.env.local` keeps the production rate limits from throttling the suites; set it to `1`
  to test the real limits (the k6 scripts log in once in `setup()` and reuse the session for exactly that reason).
* k6 streams its metrics to Prometheus (`./run.sh`), so you can watch the load in Grafana: **NextGen Bank - Service Overview**,
  **PgBouncer** (clients waiting / pool in use) and the CPU / memory 40 % alerts.
* Regression tests worth knowing: `test_customer_cannot_withdraw_from_any_account` and
  `test_customer_cannot_mint_money_by_creating_an_account` (both were real vulnerabilities in the original code).
