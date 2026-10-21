"""Defines curated articles independently of device-local offline metadata."""

import re
from datetime import datetime
from urllib.parse import urlsplit

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, TypeAdapter, field_validator

from src.core.errors import CrisisErrorCode

_SOURCE_URL = TypeAdapter(AnyHttpUrl)


class CrisisArticle(BaseModel):
    """Carries curated text, source attribution and review time; excludes local saving state.

    IDs are URL-safe segments. fetchedAt is the content edition's compilation/review timestamp in
    millisecond-precision UTC, not the time of the current HTTP request.
    """

    model_config = ConfigDict(strict=True, extra="forbid")

    id: str
    title: str
    description: str
    content: str
    source: str
    sourceUrl: str | None = None
    fetchedAt: str

    @field_validator("id", "title", "description", "content", "source")
    @classmethod
    def _require_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Required article text cannot be blank.")
        return value

    @field_validator("id")
    @classmethod
    def _validate_id(cls, value: str) -> str:
        if not re.fullmatch(r"[A-Za-z0-9_-]+", value):
            raise ValueError("Article IDs must be URL-safe segments.")
        return value

    @field_validator("sourceUrl")
    @classmethod
    def _validate_source_url(cls, value: str | None) -> str | None:
        if value is None:
            return value
        parsed = urlsplit(value)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.hostname
            or parsed.username is not None
            or parsed.password is not None
            or "\\" in value
            or any(character.isspace() or ord(character) < 32 for character in value)
        ):
            raise ValueError("Source links must be HTTP(S) URLs without credentials.")
        _ = parsed.port
        _SOURCE_URL.validate_python(value)
        return value

    @field_validator("fetchedAt")
    @classmethod
    def _validate_timestamp(cls, value: str) -> str:
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z", value):
            raise ValueError("Compilation time must use millisecond-precision UTC.")
        datetime.fromisoformat(value)
        return value


class CrisisErrorDetail(BaseModel):
    """Describes a local article failure using a public code and Swedish message."""

    code: CrisisErrorCode
    message: str


class CrisisErrorResponse(BaseModel):
    """Uses the existing error envelope without classifying local failures as upstream errors."""

    error: CrisisErrorDetail
