build:
	docker compose -f local.yml up --build -d --remove-orphans

up:
	docker compose -f local.yml up -d

down-v:
	docker compose -f local.yml down -v

down:
	docker compose -f local.yml down

nextgen-config:
	docker compose -f local.yml config

makemigrations:
	docker compose -f local.yml exec -it api alembic revision --autogenerate -m "$(name)"

migrate:
	docker compose -f local.yml exec -it api alembic upgrade head

history:
	docker compose -f local.yml exec -it api alembic history

current-migration:
	docker compose -f local.yml exec -it api alembic current

downgrade:
	docker compose -f local.yml exec -it api alembic downgrade $(version)

inspect-network:
	docker network inspect nextgen_local_nw

psql:
	docker compose -f local.yml exec -it postgres psql -U nextgen -d nextgen

logs:
	docker compose -f local.yml logs -f --tail=100 api celeryworker

# ── tests (see tests/README.md) ──
test-unit:
	docker compose -f local.yml --profile tests run --rm unit-tests

test-integration:
	docker compose -f local.yml --profile tests run --rm integration-tests

test-e2e:
	docker compose -f local.yml --profile tests up -d selenium
	docker compose -f local.yml --profile tests run --rm e2e-tests

perf-smoke:
	./tests/performance/run.sh smoke

perf-load:
	./tests/performance/run.sh load
