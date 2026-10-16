-- Complete schema of the NextGen Bank API.
--
-- Generated from the Alembic migrations (head revision ea767da8fc80), so it is identical to what
-- `alembic upgrade head` would create. The final statements stamp `alembic_version`, which makes the
-- `alembic upgrade head` that runs when the API container starts a harmless no-op.
-- Enum labels are the Python enum *member names*, because that is what SQLAlchemy stores.

DO $$ BEGIN
    CREATE TYPE accountcurrencyenum AS ENUM ('USD', 'EUR', 'GBP', 'KES');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE accountstatusenum AS ENUM ('Active', 'Inactive', 'Pending', 'Closed', 'Frozen');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE accountstatusschema AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED', 'PENDING');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE accounttypeenum AS ENUM ('Current', 'Savings', 'FixedDeposit', 'Business');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE aireviewstatusenum AS ENUM ('PENDING', 'FLAGGED', 'CLEARED', 'CONFIRMED_FRAUD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE cardblockreasonenum AS ENUM ('Lost', 'Stolen', 'Suspicious_Activity', 'Customer_Request');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE employmentstatusenum AS ENUM ('Employed', 'Unemployed', 'Self_Employed', 'Student', 'Retired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE genderenum AS ENUM ('Male', 'Female', 'Other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE identificationtypeenum AS ENUM ('Passport', 'Drivers_License', 'National_ID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE maritalstatusenum AS ENUM ('Married', 'Divorced', 'Single', 'Widowed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE modelstatusenum AS ENUM ('TRAINING', 'READY', 'DEPLOYED', 'FAILED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE relationshiptypeenum AS ENUM ('Spouse', 'Parent', 'Child', 'Sibling', 'Other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE rolechoicesschema AS ENUM ('CUSTOMER', 'ACCOUNT_EXECUTIVE', 'BRANCH_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'TELLER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE salutationenum AS ENUM ('Mr', 'Mrs', 'Miss');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE securityquestionsschema AS ENUM ('MOTHER_MAIDEN_NAME', 'CHILDHOOD_FRIEND', 'FAVORITE_COLOR', 'BIRTH_CITY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE transactioncategoryenum AS ENUM ('Credit', 'Debit');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE transactionstatusenum AS ENUM ('Pending', 'Completed', 'Failed', 'Reversed', 'Cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE transactiontypeenum AS ENUM ('Deposit', 'Withdrawal', 'Transfer', 'Reversal', 'Fee_Charged', 'Loan_Disbursement', 'Loan_Repayment', 'Interest_Credited');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE virtualcardbrandenum AS ENUM ('Visa');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE virtualcardcurrencyenum AS ENUM ('USD', 'EUR', 'GBP', 'KES');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE virtualcardstatusenum AS ENUM ('Active', 'Inactive', 'Pending', 'Blocked', 'Expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE virtualcardtypeenum AS ENUM ('Debit', 'Credit');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "user" (
    "username" VARCHAR(12),
    "email" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(30) NOT NULL,
    "middle_name" VARCHAR(30),
    "last_name" VARCHAR(30) NOT NULL,
    "id_no" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "is_superuser" BOOLEAN NOT NULL,
    "security_question" securityquestionsschema NOT NULL,
    "security_answer" VARCHAR(30) NOT NULL,
    "account_status" accountstatusschema NOT NULL,
    "role" rolechoicesschema NOT NULL,
    "id" UUID NOT NULL,
    "hashed_password" VARCHAR NOT NULL,
    "failed_login_attempts" SMALLINT NOT NULL,
    "last_failed_login" TIMESTAMP WITH TIME ZONE,
    "otp" VARCHAR(6) NOT NULL,
    "otp_expiry_time" TIMESTAMP WITH TIME ZONE,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT user_pkey PRIMARY KEY ("id"),
    CONSTRAINT user_id_no_key UNIQUE ("id_no"),
    CONSTRAINT user_username_key UNIQUE ("username")
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_user_email ON "user" ("email");

CREATE TABLE IF NOT EXISTS "profile" (
    "title" salutationenum NOT NULL,
    "gender" genderenum NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "country_of_birth" VARCHAR NOT NULL,
    "place_of_birth" VARCHAR NOT NULL,
    "marital_status" maritalstatusenum NOT NULL,
    "means_of_identification" identificationtypeenum NOT NULL,
    "id_issue_date" DATE NOT NULL,
    "id_expiry_date" DATE NOT NULL,
    "passport_number" VARCHAR NOT NULL,
    "nationality" VARCHAR NOT NULL,
    "phone_number" VARCHAR NOT NULL,
    "address" VARCHAR NOT NULL,
    "city" VARCHAR NOT NULL,
    "country" VARCHAR NOT NULL,
    "employment_status" employmentstatusenum NOT NULL,
    "employer_name" VARCHAR NOT NULL,
    "employer_address" VARCHAR NOT NULL,
    "employer_city" VARCHAR NOT NULL,
    "employer_country" VARCHAR NOT NULL,
    "annual_income" DOUBLE PRECISION NOT NULL,
    "date_of_employment" DATE NOT NULL,
    "profile_photo_url" VARCHAR,
    "id_photo_url" VARCHAR,
    "signature_photo_url" VARCHAR,
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
    "user_id" UUID NOT NULL,
    CONSTRAINT profile_pkey PRIMARY KEY ("id"),
    CONSTRAINT profile_user_id_fkey FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "nextofkin" (
    "full_name" VARCHAR(100) NOT NULL,
    "relationship" relationshiptypeenum NOT NULL,
    "email" VARCHAR NOT NULL,
    "phone_number" VARCHAR NOT NULL,
    "address" VARCHAR NOT NULL,
    "city" VARCHAR NOT NULL,
    "country" VARCHAR NOT NULL,
    "nationality" VARCHAR NOT NULL,
    "id_number" VARCHAR,
    "passport_number" VARCHAR,
    "is_primary" BOOLEAN NOT NULL,
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
    "user_id" UUID NOT NULL,
    CONSTRAINT nextofkin_pkey PRIMARY KEY ("id"),
    CONSTRAINT nextofkin_user_id_fkey FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "bankaccount" (
    "account_type" accounttypeenum NOT NULL,
    "currency" accountcurrencyenum NOT NULL,
    "account_status" accountstatusenum NOT NULL,
    "account_number" VARCHAR,
    "account_name" VARCHAR NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "is_primary" BOOLEAN NOT NULL,
    "kyc_submitted" BOOLEAN NOT NULL,
    "kyc_verified" BOOLEAN NOT NULL,
    "kyc_verified_by" UUID,
    "interest_rate" DOUBLE PRECISION NOT NULL,
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
    "kyc_verified_on" TIMESTAMP WITH TIME ZONE,
    "user_id" UUID NOT NULL,
    CONSTRAINT bankaccount_pkey PRIMARY KEY ("id"),
    CONSTRAINT bankaccount_user_id_fkey FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_bankaccount_account_number ON "bankaccount" ("account_number");

CREATE TABLE IF NOT EXISTS "transaction" (
    "amount" NUMERIC NOT NULL,
    "description" VARCHAR(250) NOT NULL,
    "reference" VARCHAR NOT NULL,
    "transaction_type" transactiontypeenum NOT NULL,
    "transaction_category" transactioncategoryenum NOT NULL,
    "status" transactionstatusenum NOT NULL,
    "balance_before" NUMERIC NOT NULL,
    "balance_after" NUMERIC NOT NULL,
    "failed_reason" VARCHAR,
    "id" UUID NOT NULL,
    "sender_account_id" UUID,
    "receiver_account_id" UUID,
    "sender_id" UUID,
    "receiver_id" UUID,
    "processed_by" UUID,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP WITH TIME ZONE,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
    "transaction_metadata" JSONB,
    "ai_review_status" aireviewstatusenum,
    CONSTRAINT transaction_pkey PRIMARY KEY ("id"),
    CONSTRAINT transaction_processed_by_fkey FOREIGN KEY ("processed_by") REFERENCES "user" ("id"),
    CONSTRAINT transaction_receiver_account_id_fkey FOREIGN KEY ("receiver_account_id") REFERENCES "bankaccount" ("id"),
    CONSTRAINT transaction_receiver_id_fkey FOREIGN KEY ("receiver_id") REFERENCES "user" ("id"),
    CONSTRAINT transaction_sender_account_id_fkey FOREIGN KEY ("sender_account_id") REFERENCES "bankaccount" ("id"),
    CONSTRAINT transaction_sender_id_fkey FOREIGN KEY ("sender_id") REFERENCES "user" ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_transaction_reference ON "transaction" ("reference");

CREATE TABLE IF NOT EXISTS "idempotencykey" (
    "id" UUID NOT NULL,
    "key" VARCHAR NOT NULL,
    "user_id" UUID NOT NULL,
    "endpoint" VARCHAR NOT NULL,
    "response_code" INTEGER NOT NULL,
    "response_body" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT idempotencykey_pkey PRIMARY KEY ("id"),
    CONSTRAINT idempotencykey_user_id_fkey FOREIGN KEY ("user_id") REFERENCES "user" ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_idempotencykey_key ON "idempotencykey" ("key");

CREATE TABLE IF NOT EXISTS "virtualcard" (
    "card_type" virtualcardtypeenum NOT NULL,
    "card_brand" virtualcardbrandenum NOT NULL,
    "currency" virtualcardcurrencyenum NOT NULL,
    "card_status" virtualcardstatusenum NOT NULL,
    "daily_limit" DOUBLE PRECISION NOT NULL,
    "monthly_limit" DOUBLE PRECISION NOT NULL,
    "name_on_card" VARCHAR(50) NOT NULL,
    "expiry_date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "is_physical_card_requested" BOOLEAN NOT NULL,
    "block_reason" cardblockreasonenum,
    "block_reason_description" VARCHAR,
    "card_number" VARCHAR,
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
    "cvv_hash" VARCHAR,
    "available_balance" DOUBLE PRECISION NOT NULL,
    "total_topped_up" DOUBLE PRECISION NOT NULL,
    "last_top_up_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blocked_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_spend_today" DOUBLE PRECISION NOT NULL,
    "total_spent_this_month" DOUBLE PRECISION NOT NULL,
    "last_transaction_date" TIMESTAMP WITH TIME ZONE,
    "last_transaction_amount" DOUBLE PRECISION,
    "physical_card_requested_at" TIMESTAMP WITH TIME ZONE,
    "delivery_address" VARCHAR,
    "delivery_city" VARCHAR,
    "delivery_country" VARCHAR,
    "delivery_postal_code" VARCHAR,
    "physical_card_status" VARCHAR,
    "blocked_by" UUID,
    "card_metadata" JSONB,
    "bank_account_id" UUID NOT NULL,
    CONSTRAINT virtualcard_pkey PRIMARY KEY ("id"),
    CONSTRAINT virtualcard_blocked_by_fkey FOREIGN KEY ("blocked_by") REFERENCES "user" ("id"),
    CONSTRAINT virtualcard_bank_account_id_fkey FOREIGN KEY ("bank_account_id") REFERENCES "bankaccount" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "ratelimitlog" (
    "id" UUID NOT NULL,
    "ip_address" VARCHAR NOT NULL,
    "user_id" UUID,
    "endpoint" VARCHAR NOT NULL,
    "request_count" INTEGER NOT NULL,
    "request_method" VARCHAR NOT NULL,
    "request_path" VARCHAR NOT NULL,
    "window_start" TIMESTAMP WITH TIME ZONE,
    "window_end" TIMESTAMP WITH TIME ZONE,
    "blocked_until" TIMESTAMP WITH TIME ZONE,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ratelimitlog_pkey PRIMARY KEY ("id"),
    CONSTRAINT ratelimitlog_user_id_fkey FOREIGN KEY ("user_id") REFERENCES "user" ("id")
);

CREATE INDEX IF NOT EXISTS ix_ratelimitlog_ip_address ON "ratelimitlog" ("ip_address");

CREATE TABLE IF NOT EXISTS "transactionriskscore" (
    "id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "risk_score" DOUBLE PRECISION NOT NULL,
    "risk_factors" JSONB,
    "ai_model_version" VARCHAR NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" UUID,
    "is_confirmed_fraud" BOOLEAN,
    CONSTRAINT transactionriskscore_pkey PRIMARY KEY ("id"),
    CONSTRAINT transactionriskscore_reviewed_by_fkey FOREIGN KEY ("reviewed_by") REFERENCES "user" ("id"),
    CONSTRAINT transactionriskscore_transaction_id_fkey FOREIGN KEY ("transaction_id") REFERENCES "transaction" ("id")
);

CREATE INDEX IF NOT EXISTS ix_transactionriskscore_risk_score ON "transactionriskscore" ("risk_score");

CREATE INDEX IF NOT EXISTS ix_transactionriskscore_transaction_id ON "transactionriskscore" ("transaction_id");

CREATE TABLE IF NOT EXISTS "mlmodel" (
    "id" UUID NOT NULL,
    "name" VARCHAR NOT NULL,
    "version" VARCHAR NOT NULL,
    "status" modelstatusenum NOT NULL,
    "auc_score" DOUBLE PRECISION NOT NULL,
    "precision" DOUBLE PRECISION NOT NULL,
    "recall" DOUBLE PRECISION NOT NULL,
    "f1_score" DOUBLE PRECISION NOT NULL,
    "features" VARCHAR[],
    "hyperparameters" JSONB,
    "training_dataset_size" INTEGER NOT NULL,
    "mlflow_run_id" VARCHAR,
    "mlflow_experiment_id" VARCHAR,
    "mlflow_model_uri" VARCHAR,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trained_at" TIMESTAMP WITH TIME ZONE,
    "deployed_at" TIMESTAMP WITH TIME ZONE,
    CONSTRAINT mlmodel_pkey PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS ix_mlmodel_name ON "mlmodel" ("name");

CREATE INDEX IF NOT EXISTS ix_mlmodel_version ON "mlmodel" ("version");

CREATE TABLE IF NOT EXISTS "trainingdataset" (
    "id" UUID NOT NULL,
    "name" VARCHAR NOT NULL,
    "version" VARCHAR NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_samples" INTEGER NOT NULL,
    "fraud_samples" INTEGER NOT NULL,
    "legitimate_samples" INTEGER NOT NULL,
    "start_date" TIMESTAMP WITH TIME ZONE NOT NULL,
    "end_date" TIMESTAMP WITH TIME ZONE NOT NULL,
    "dataset_path" VARCHAR NOT NULL,
    "mlflow_artifact_uri" VARCHAR,
    "feature_info" JSONB,
    CONSTRAINT trainingdataset_pkey PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "modelprediction" (
    "id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "model_id" UUID NOT NULL,
    "prediction_score" DOUBLE PRECISION NOT NULL,
    "prediction_timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
    "input_features" JSONB,
    "true_label" BOOLEAN,
    "mlflow_run_id" VARCHAR,
    CONSTRAINT modelprediction_pkey PRIMARY KEY ("id"),
    CONSTRAINT modelprediction_model_id_fkey FOREIGN KEY ("model_id") REFERENCES "mlmodel" ("id"),
    CONSTRAINT modelprediction_transaction_id_fkey FOREIGN KEY ("transaction_id") REFERENCES "transaction" ("id")
);

CREATE INDEX IF NOT EXISTS ix_modelprediction_model_id ON "modelprediction" ("model_id");

CREATE INDEX IF NOT EXISTS ix_modelprediction_transaction_id ON "modelprediction" ("transaction_id");

-- ───────────── Alembic bookkeeping ─────────────
CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);
INSERT INTO alembic_version (version_num) VALUES ('ea767da8fc80') ON CONFLICT DO NOTHING;
