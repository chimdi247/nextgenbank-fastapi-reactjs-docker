-- Read-only access for Grafana's PostgreSQL data source (business KPI panels).
-- Column-level grants on "user": credentials, OTPs and security answers are NOT readable.
GRANT USAGE ON SCHEMA public TO grafana_ro;
GRANT SELECT (id, username, email, role, is_active, account_status, created_at) ON "user" TO grafana_ro;
GRANT SELECT (id, user_id, account_type, currency, account_status, balance, is_primary, kyc_verified, created_at) ON bankaccount TO grafana_ro;
GRANT SELECT (id, amount, transaction_type, transaction_category, status, created_at, completed_at, ai_review_status) ON "transaction" TO grafana_ro;
GRANT SELECT (id, transaction_id, risk_score, created_at, is_confirmed_fraud) ON transactionriskscore TO grafana_ro;
GRANT SELECT (id, card_type, currency, card_status, available_balance, created_at) ON virtualcard TO grafana_ro;
GRANT SELECT (id, name, version, status, auc_score, created_at, deployed_at) ON mlmodel TO grafana_ro;
ALTER ROLE grafana_ro SET statement_timeout = '10s';
ALTER ROLE grafana_ro SET default_transaction_read_only = on;
