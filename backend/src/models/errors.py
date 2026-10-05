"""Defines the stable response body for failures retrieving VMA information."""

from pydantic import BaseModel

from src.core.errors import UpstreamErrorCode


class ErrorDetail(BaseModel):
    """Describes a failed upstream request using a machine code and Swedish message."""

    code: UpstreamErrorCode
    message: str


class ErrorResponse(BaseModel):
    """Wraps an upstream failure so it cannot be confused with a successful empty list."""

    error: ErrorDetail
