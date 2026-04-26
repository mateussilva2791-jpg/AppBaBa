from functools import lru_cache

from typing import Annotated

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Baba SaaS API"
    environment: str = Field(default="development", validation_alias=AliasChoices("ENVIRONMENT", "ENV"))
    api_prefix: str = "/api"
    api_host: str = Field(default="0.0.0.0", validation_alias=AliasChoices("API_HOST", "HOST"))
    api_port: int = Field(default=8000, validation_alias=AliasChoices("PORT", "API_PORT"))
    api_workers: int = 1
    log_level: str = "info"
    secret_key: str = Field(min_length=32)
    access_token_expire_minutes: int = 60
    database_url: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/baba_saas",
        validation_alias=AliasChoices("DATABASE_URL"),
    )
    database_pool_size: int = 10
    database_max_overflow: int = 20
    database_pool_timeout: int = 30
    database_pool_recycle: int = 1800
    frontend_url: str = Field(
        default="http://127.0.0.1:3001",
        validation_alias=AliasChoices("FRONTEND_URL", "FRONTEND_ORIGIN"),
    )
    cors_allowed_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=list,
        validation_alias=AliasChoices("CORS_ALLOWED_ORIGINS", "CORS_ORIGINS"),
    )
    allowed_hosts: Annotated[list[str], NoDecode] = Field(default_factory=list)

    smtp_host: str = Field(default="smtp.gmail.com")
    smtp_port: int = Field(default=587)
    smtp_user: str = Field(default="")
    smtp_password: str = Field(default="")
    smtp_from: str = Field(default="App do Baba <noreply@appdobaba.com>")
    smtp_tls: bool = Field(default=True)
    smtp_enabled: bool = Field(default=False)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @field_validator("cors_allowed_origins", "allowed_hosts", mode="before")
    @classmethod
    def parse_csv_list(cls, value: str | list[str] | None):
        if value is None:
            return []
        if isinstance(value, list):
            return [item.strip() for item in value if item and item.strip()]
        return [item.strip() for item in value.split(",") if item.strip()]

    @field_validator("environment")
    @classmethod
    def normalize_environment(cls, value: str):
        normalized = value.strip().lower()
        allowed = {"development", "staging", "production", "test"}
        if normalized not in allowed:
            raise ValueError(f"Unsupported environment: {value}")
        return normalized

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str):
        if not isinstance(value, str):
            return value
        normalized = value.strip()
        if normalized.startswith("postgres://"):
            return normalized.replace("postgres://", "postgresql+psycopg://", 1)
        if normalized.startswith("postgresql://") and "+psycopg" not in normalized:
            return normalized.replace("postgresql://", "postgresql+psycopg://", 1)
        return normalized

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def resolved_cors_origins(self) -> list[str]:
        origins = set(self.cors_allowed_origins)
        if self.frontend_url:
            origins.add(self.frontend_url.rstrip("/"))

        if not self.is_production:
            origins.update(
                {
                    "http://localhost:3000",
                    "http://127.0.0.1:3000",
                    "http://localhost:3001",
                    "http://127.0.0.1:3001",
                }
            )

        return sorted(origin for origin in origins if origin)

    @property
    def resolved_allowed_hosts(self) -> list[str]:
        return [host for host in self.allowed_hosts if host]


@lru_cache
def get_settings() -> Settings:
    return Settings()
