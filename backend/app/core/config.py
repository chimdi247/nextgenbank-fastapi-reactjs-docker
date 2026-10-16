from typing import Literal

import cloudinary
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # TODO: change to production when time comes
    ENVIRONMENT: Literal["local", "staging", "production"] = "production"

    model_config = SettingsConfigDict(
        env_file="../../.envs/.env.production", env_ignore_empty=True, extra="ignore"
    )
    API_V1_STR: str = ""
    PROJECT_NAME: str = ""
    PROJECT_DESCRIPTION: str = ""
    SITE_NAME: str = ""
    DATABASE_URL: str = ""
    # Direct (non-pooled) connection used by Alembic. DATABASE_URL may point at PgBouncer.
    DATABASE_DIRECT_URL: str = ""
    # PgBouncer in transaction-pooling mode cannot share server-side prepared statements
    DB_USE_PGBOUNCER: bool = False
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    MAIL_FROM: str = ""
    MAIL_FROM_NAME: str = ""
    MAILGUN_SMTP_SERVER: str = "smtp.mailgun.org"
    MAILGUN_SMTP_PORT: int = 587
    MAILGUN_SMTP_USERNAME: str = ""
    MAILGUN_SMTP_PASSWORD: str = ""

    SMTP_HOST: str = "mailpit"
    SMTP_PORT: int = 1025
    MAILPIT_UI_PORT: int = 8025

    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    RABBITMQ_HOST: str = "rabbitmq"
    RABBITMQ_PORT: int = 5672
    RABBITMQ_USER: str = "guest"
    RABBITMQ_PASSWORD: str = "guest"

    OTP_EXPIRATION_MINUTES: int = 2 if ENVIRONMENT == "local" else 5
    LOGIN_ATTEMPTS: int = 3
    LOCKOUT_DURATION_MINUTES: int = 2 if ENVIRONMENT == "local" else 5
    ACTIVATION_TOKEN_EXPIRATION_MINUTES: int = 2 if ENVIRONMENT == "local" else 5
    API_BASE_URL: str = ""
    SUPPORT_EMAIL: str = ""
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRATION_MINUTES: int = 30 if ENVIRONMENT == "local" else 15
    JWT_REFRESH_TOKEN_EXPIRATION_DAYS: int = 1
    COOKIE_SECURE: bool = False if ENVIRONMENT == "local" else True
    COOKIE_ACCESS_NAME: str = "access_token"
    COOKIE_REFRESH_NAME: str = "refresh_token"
    COOKIE_LOGGED_IN_NAME: str = "logged_in"

    COOKIE_HTTP_ONLY: bool = True
    COOKIE_SAMESITE: str = "lax"
    COOKIE_PATH: str = "/"
    SIGNING_KEY: str = ""
    PASSWORD_RESET_TOKEN_EXPIRATION_MINUTES: int = 3 if ENVIRONMENT == "local" else 5

    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    ALLOWED_MIME_TYPES: list[str] = ["image/jpeg", "image/png", "image/jpg"]
    MAX_FILE_SIZE: int = 5 * 1024 * 1024
    MAX_DIMENSION: int = 4096

    BANK_CODE: str = ""
    BANK_BRANCH_CODE: str = ""
    CURRENCY_CODE_USD: str = "01"
    CURRENCY_CODE_EUR: str = "02"
    CURRENCY_CODE_GBP: str = "03"
    CURRENCY_CODE_KES: str = "04"
    MAX_BANK_ACCOUNTS: int = 3

    # Multiplies every limit in core/rate_limit/config.py (1 = as configured). Load tests raise it.
    RATE_LIMIT_MULTIPLIER: int = 1

    # Where the web UI is served from (used to build links inside e-mails)
    FRONTEND_URL: str = ""
    # Shown to developers on the OTP screen of the UI so they can read the e-mail (local only)
    MAILPIT_PUBLIC_URL: str = "http://localhost:8025"

    # OpenTelemetry (traces, metrics, logs -> collector -> Tempo / Prometheus / Loki)
    OTEL_ENABLED: bool = True
    OTEL_EXPORTER_OTLP_ENDPOINT: str = "http://otel-collector:4317"
    OTEL_SERVICE_NAMESPACE: str = "nextgenbank"
    APP_VERSION: str = "1.0.0"

    @model_validator(mode="after")
    def _apply_environment_defaults(self) -> "Settings":
        """The class-body defaults above are evaluated before ENVIRONMENT is read from the
        environment, so they always used the *production* branch (e.g. COOKIE_SECURE=True,
        which makes browsers drop the auth cookies over plain http). Re-derive them here,
        unless the value was set explicitly."""
        if self.ENVIRONMENT == "local":
            local_defaults = {
                "OTP_EXPIRATION_MINUTES": 5,
                "LOCKOUT_DURATION_MINUTES": 2,
                "ACTIVATION_TOKEN_EXPIRATION_MINUTES": 60,
                "JWT_ACCESS_TOKEN_EXPIRATION_MINUTES": 30,
                "PASSWORD_RESET_TOKEN_EXPIRATION_MINUTES": 30,
                "COOKIE_SECURE": False,
            }
            for name, value in local_defaults.items():
                if name not in self.model_fields_set:
                    setattr(self, name, value)
        return self


settings = Settings()

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
)
