"""Defines the backend's local health response."""

from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Reports application availability independently of the upstream VMA service."""

    status: Literal["ok"] = "ok"
