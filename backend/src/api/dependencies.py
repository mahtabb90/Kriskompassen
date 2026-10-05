"""Makes application-scoped resources available to routers through dependency injection."""

import httpx
from fastapi import Request

from src.core.config import Settings


async def get_settings(request: Request) -> Settings:
    """Returns the settings validated when this application instance was created."""
    return request.app.state.settings


async def get_http_client(request: Request) -> httpx.AsyncClient:
    """Returns the shared client managed by the application's lifespan context."""
    return request.app.state.http_client
