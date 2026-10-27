from __future__ import annotations

import logging
import sys
from functools import lru_cache

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
    )

    env: str = Field(default="development")
    database_url: str = Field(
        default="postgresql+asyncpg://mostro:mostro@postgres:5432/mostro"
    )
    userdb_url: str | None = Field(default=None)
    redis_url: str = Field(default="redis://redis:6379/0")
    meterless_proxy_url: str = Field(
        default="http://nightshift:8080/api/v1/completions"
    )
    meterless_usage_url: str | None = Field(default=None)
    meterless_api_key: str | None = Field(default=None)
    nemetron_bolt_url: str | None = Field(default=None)
    nemetron_bolt_model: str = Field(default="nemetron-bolt")
    embedding_api_url: str | None = Field(default=None)
    embedding_api_key: str | None = Field(default=None)
    embedding_model: str = Field(default="voyage-3.5")
    embedding_dimension: int = Field(default=1024)
    model_timeout_seconds: float = Field(default=60.0)
    retrieval_threshold: float = Field(default=0.70)
    retrieval_max_attempts: int = Field(default=3)
    input_cost_per_million_tokens: float = Field(default=0.0)
    output_cost_per_million_tokens: float = Field(default=0.0)
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
        "embedding_api_url",
        "embedding_api_key",
        mode="before",
    )
    @classmethod
    def empty_str_to_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

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
        return self.nemetron_bolt_url or self.meterless_proxy_url

    @property
    def google_oauth_configured(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)

    @property
    def aes_key_bytes(self) -> bytes:
        return bytes.fromhex(self.aes_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
