"""Loads backend settings from process environment variables and local defaults."""

from urllib.parse import urlsplit

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Team decision, not an SR requirement: SR documents no rate limit. One SR attempt per period
# and instance keeps upstream load independent of the number of clients polling this backend.
VMA_CACHE_TTL_SECONDS = 60


class Settings(BaseSettings):
    """Configures upstream VMA access and browser origins without loading .env files.

    Timeout is the total upstream request budget in seconds. CORS origins are supplied
    as a JSON array through KRISKOMPASSEN_CORS_ORIGINS when overriding local defaults.
    """

    model_config = SettingsConfigDict(env_prefix="KRISKOMPASSEN_", env_file=None)

    vma_api_url: AnyHttpUrl = AnyHttpUrl("https://vmaapi.sr.se/api/v3/alerts")
    vma_timeout_seconds: float = Field(default=8.0, gt=0, allow_inf_nan=False)
    geocode_api_url: AnyHttpUrl = AnyHttpUrl("https://nominatim.openstreetmap.org/reverse")
    # A sibling Nominatim endpoint, not derived from geocode_api_url by string surgery, so each
    # stays independently configurable.
    geocode_search_api_url: AnyHttpUrl = AnyHttpUrl("https://nominatim.openstreetmap.org/search")
    geocode_timeout_seconds: float = Field(default=8.0, gt=0, allow_inf_nan=False)
    # Identifies the app and, per Nominatim's politeness recommendation (not a hard policy
    # requirement), gives a reachable contact so OSMF can reach us instead of only banning us.
    geocode_user_agent: str = "KrisKompassen/0.1 (+https://github.com/mahtabb90/Kriskompassen)"
    # Configurable, unlike VMA_CACHE_TTL_SECONDS below, so cache/throttle tuning under real
    # Nominatim load does not need a code change.
    geocode_cache_ttl_seconds: float = Field(default=300.0, gt=0, allow_inf_nan=False)
    geocode_min_interval_seconds: float = Field(default=1.0, gt=0, allow_inf_nan=False)
    # Bounds the worst-case queued wait to roughly max_queue_depth * min_interval_seconds; a
    # request arriving once the queue is already full fails fast instead of piling up.
    geocode_max_queue_depth: int = Field(default=10, gt=0)
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
