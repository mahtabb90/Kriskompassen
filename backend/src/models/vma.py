"""Validates SR's feed envelope and supplies public provenance for consumers."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, JsonValue, field_validator


class UpstreamVmaResponse(BaseModel):
    """Preserves all alert entries for per-record validation in the frontend.

    The timestamp belongs to the feed, not to any individual alert. Unknown upstream
    envelope fields are ignored; source attribution is always supplied by our backend.
    """

    model_config = ConfigDict(strict=True)
    timestamp: str
    alerts: list[JsonValue]

    @field_validator("timestamp")
    @classmethod
    def validate_timestamp(cls, value: str) -> str:
        """Requires an ISO timestamp with an explicit timezone."""
        parsed = datetime.fromisoformat(value)
        if "T" not in value or parsed.tzinfo is None:
            raise ValueError("The feed timestamp must include a time and timezone.")
        return value


class VmaSource(BaseModel):
    """Identifies the upstream provider and public API without exposing URL credentials."""

    name: str = "Sveriges Radio"
    url: str = "https://www.sverigesradio.se/"
    apiName: str = "Sveriges Radios VMA-API"
    apiVersion: str = "3"
    apiDocumentationUrl: str = "https://vmaapi.sr.se/index.html"
    apiUrl: str


class VmaResponse(UpstreamVmaResponse):
    """Keeps provenance available even when a successful feed contains no alerts."""

    source: VmaSource
