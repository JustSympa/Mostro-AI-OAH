from __future__ import annotations

import logging
import sys
from functools import lru_cache
from urllib.parse import urlsplit

from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger("mostro")

DEV_JWT_SECRET = "dev-only-change-me"
DEV_AES_KEY_HEX = "0" * 64


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
        hide_input_in_errors=True,
    )

    env: str = Field(default="development")
    database_url: str = Field(
        default="postgresql+asyncpg://mostro:mostro@postgres:5432/mostro"
    )
    userdb_url: str | None = Field(default=None)
    redis_url: str = Field(default="redis://redis:6379/0")
    meterless_proxy_url: str = Field(
        default="http://127.0.0.1:8088/v1"
    )
    meterless_model: str = Field(default="meterless/auto", pattern=r"^meterless/[^\s]+$")
    meterless_app_id: str = Field(default="mostro-ai-oah", pattern=r"^[a-z0-9][a-z0-9-]*$")
    meterless_timeout_seconds: float = Field(default=180.0, gt=0)
    meterless_max_tokens: int = Field(default=2048, ge=1, le=65536)
    meterless_usage_url: str | None = Field(default=None)
    meterless_api_key: str | None = Field(default=None, repr=False)
    nemetron_bolt_url: str | None = Field(default=None)
    nemetron_bolt_model: str | None = Field(default=None)
    jev_endpoint: str | None = Field(default=None)
    jev_api_key: str | None = Field(default=None)
    jev_model: str = Field(default="jev-latest")
    hmem_enabled: bool = Field(default=True)

    zetaris_rest_url: str | None = Field(default=None)
    zetaris_org_id: str | None = Field(default=None, pattern=r"^[0-9]+$")
    zetaris_api_key: str | None = Field(default=None)
    zetaris_username: str | None = Field(default=None)
    zetaris_password: str | None = Field(default=None)
    zetaris_datasource: str = Field(default="mostro", pattern=r"^[A-Za-z_][A-Za-z0-9_]*$")
    zetaris_timeout_seconds: float = Field(default=60.0, gt=0)
    zetaris_page_size: int = Field(default=100, ge=1, le=100)
    zetaris_max_rows: int = Field(default=10000, ge=1)

    embedding_api_url: str | None = Field(default="https://api.voyageai.com/v1/embeddings")
    embedding_api_key: str | None = Field(default=None)
    embedding_model: str = Field(default="voyage-3.5")
    embedding_dimension: int = Field(default=1024, ge=1024, le=1024)
    embedding_batch_size: int = Field(default=32, ge=1, le=1000)
    embedding_max_attempts: int = Field(default=3, ge=1, le=6)
    model_timeout_seconds: float = Field(default=60.0)
    retrieval_threshold: float = Field(default=0.70)
    retrieval_max_attempts: int = Field(default=3)
    input_cost_per_million_tokens: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    output_cost_per_million_tokens: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    jwt_secret: str = Field(default=DEV_JWT_SECRET)
    aes_key: str = Field(default=DEV_AES_KEY_HEX)
    access_token_ttl_seconds: int = Field(default=900)
    refresh_token_ttl_seconds: int = Field(default=2_592_000)
    mfa_challenge_ttl_seconds: int = Field(default=300)
    email_verify_ttl_seconds: int = Field(default=86_400)
    cookie_secure: bool = Field(default=False)
    cookie_domain: str | None = Field(default=None)
    google_client_id: str | None = Field(default=None)
    google_client_secret: str | None = Field(default=None)
    google_redirect_uri: str = Field(
        default="http://localhost:8000/auth/google/callback"
    )
    public_base_url: str = Field(default="http://localhost:8000")
    jwt_algorithm: str = Field(default="HS256")
    postgres_host: str = Field(default="postgres")
    postgres_port: int = Field(default=5432, validation_alias=AliasChoices("POSTGRES_PORT"))
    # Comma-separated list of allowed CORS origins.
    # Defaults to localhost dev origins for frontend + docs.
    cors_allowed_origins: str = Field(
        default="http://localhost:3000,http://localhost:8000"
    )

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]

    @field_validator(
        "google_client_id",
        "google_client_secret",
        "cookie_domain",
        "userdb_url",
        "meterless_usage_url",
        "meterless_api_key",
        "nemetron_bolt_url",
        "nemetron_bolt_model",
        "embedding_api_url",
        "embedding_api_key",
        "jev_endpoint",
        "jev_api_key",
        "zetaris_rest_url",
        "zetaris_org_id",
        "zetaris_api_key",
        "zetaris_username",
        "zetaris_password",
        mode="before",
    )
    @classmethod
    def empty_str_to_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("meterless_proxy_url")
    @classmethod
    def normalize_meterless_url(cls, value: str) -> str:
        value = value.strip()
        if "://" not in value:
            value = f"http://{value}"
        url = urlsplit(value)
        if (
            url.scheme not in {"http", "https"} or not url.hostname or url.username
            or url.password or url.query or url.fragment
            or url.path.rstrip("/") not in {"", "/v1", "/v1/chat/completions", "/v1/models", "/healthz"}
        ):
            raise ValueError(
                "METERLESS_PROXY_URL must point to Nightshift's OpenAI-compatible runtime "
                "(origin, /v1, /v1/chat/completions, /v1/models or /healthz)"
            )
        try:
            url.port
        except ValueError as exc:
            raise ValueError("METERLESS_PROXY_URL has an invalid port") from exc
        return f"{url.scheme}://{url.netloc}/v1"

    @model_validator(mode="after")
    def reject_obsolete_model_configuration(self) -> Settings:
        if self.nemetron_bolt_url or self.nemetron_bolt_model:
            raise ValueError(
                "Remove NEMETRON_BOLT_URL and NEMETRON_BOLT_MODEL. Generation must use "
                "METERLESS_PROXY_URL and a METERLESS_MODEL route; select Nemotron in Nightshift."
            )
        if self.meterless_usage_url:
            raise ValueError(
                "Remove METERLESS_USAGE_URL: Nightshift has no documented usage-reporting endpoint. "
                "Usage comes from the chat response and is logged locally."
            )
        return self

    @field_validator("zetaris_rest_url")
    @classmethod
    def valid_zetaris_rest_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        url = urlsplit(value)
        if (
            url.scheme not in {"http", "https"} or not url.netloc or url.username
            or url.password or url.query or url.fragment
            or url.path.rstrip("/") not in {"", "/api/v1.0"}
        ):
            raise ValueError("ZETARIS_REST_URL must be an HTTP(S) origin or /api/v1.0 base URL")
        return value.rstrip("/")

    @field_validator("aes_key")
    @classmethod
    def aes_key_is_32_bytes_hex(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) != 64:
            raise ValueError("AES_KEY must be 64 hex characters (32 bytes)")
        try:
            bytes.fromhex(cleaned)
        except ValueError as exc:
            raise ValueError("AES_KEY must be valid hex") from exc
        return cleaned

    @model_validator(mode="after")
    def refuse_placeholder_secrets_in_production(self) -> Settings:
        if self.env.lower() == "production" and self.jwt_secret == DEV_JWT_SECRET:
            print(
                "FATAL: ENV=production but JWT_SECRET is still 'dev-only-change-me'. Refusing to boot.",
                file=sys.stderr,
                flush=True,
            )
            raise SystemExit(1)
        if self.env.lower() == "production" and self.aes_key == DEV_AES_KEY_HEX:
            print(
                "FATAL: ENV=production but AES_KEY is still the all-zero placeholder. Refusing to boot.",
                file=sys.stderr,
                flush=True,
            )
            raise SystemExit(1)
        if self.jwt_secret == DEV_JWT_SECRET or self.aes_key == DEV_AES_KEY_HEX:
            logger.warning(
                "============================================================\n"
                "WARNING: running with committed DEV DEFAULT secrets.\n"
                "JWT_SECRET and/or AES_KEY are placeholders. Fine for the\n"
                "examiner laptop; rotate before any real deployment.\n"
                "============================================================"
            )
        return self

    @property
    def is_production(self) -> bool:
        return self.env.lower() == "production"

    @property
    def agent_userdb_url(self) -> str:
        return self.userdb_url or self.database_url

    @property
    def model_url(self) -> str:
        return f"{self.meterless_proxy_url}/chat/completions"

    @property
    def google_oauth_configured(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)

    @property
    def aes_key_bytes(self) -> bytes:
        return bytes.fromhex(self.aes_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
