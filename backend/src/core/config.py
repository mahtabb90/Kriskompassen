"""Loads backend settings from process environment variables and local defaults."""

from urllib.parse import urlsplit

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configures upstream VMA access and browser origins without loading .env files.

    Timeout is the total upstream request budget in seconds. CORS origins are supplied
    as a JSON array through KRISKOMPASSEN_CORS_ORIGINS when overriding local defaults.
    """

    model_config = SettingsConfigDict(env_prefix="KRISKOMPASSEN_", env_file=None)

    vma_api_url: AnyHttpUrl = AnyHttpUrl(
        "https://api.krisinformation.se/v3/vmas?format=json&allcounties=true&language=sv"
    )
    vma_timeout_seconds: float = Field(default=8.0, gt=0, allow_inf_nan=False)
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"]
    )

    @field_validator("cors_origins")
    @classmethod
    def validate_origins(cls, origins: list[str]) -> list[str]:
        """Requires explicit HTTP(S) origins and normalizes an optional trailing slash."""
        normalized = []
        for origin in origins:
            parsed = urlsplit(origin)
            if (
                parsed.scheme not in {"http", "https"}
                or not parsed.hostname
                or "*" in origin
                or parsed.username is not None
                or parsed.password is not None
                or parsed.path not in {"", "/"}
                or parsed.query
                or parsed.fragment
            ):
                raise ValueError("CORS origins must be explicit HTTP(S) origins without paths.")
            # Accessing port also rejects malformed or out-of-range port numbers.
            _ = parsed.port
            normalized.append(f"{parsed.scheme}://{parsed.netloc.lower()}")
        return normalized
