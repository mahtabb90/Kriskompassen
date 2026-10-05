"""Creates the FastAPI application used by Uvicorn and the Vercel Python runtime."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api import health, vma
from src.core.config import Settings
from src.core.errors import UpstreamError
from src.models.errors import ErrorDetail, ErrorResponse

logger = logging.getLogger(__name__)


def create_app(settings: Settings | None = None) -> FastAPI:
    """Builds an independent application with validated settings and managed HTTP resources.

    Uses process environment settings when none are supplied. Invalid configuration raises
    a Pydantic validation error before the app serves requests. No upstream calls are made
    at import or startup; the shared client is opened and closed with the application.
    """
    app_settings = settings if settings is not None else Settings()

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        async with httpx.AsyncClient() as client:
            application.state.http_client = client
            yield

    application = FastAPI(
        title="KrisKompassen API",
        version="0.1.0",
        description="Retrieves Swedish VMA information from Krisinformation.se.",
        lifespan=lifespan,
    )
    application.state.settings = app_settings
    application.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET"],
        allow_headers=["Accept"],
    )

    @application.exception_handler(UpstreamError)
    async def handle_upstream_error(_request: Request, error: UpstreamError) -> JSONResponse:
        """Renders a stable failure body and logs its code without upstream content."""
        logger.warning("VMA retrieval failed: %s", error.code)
        body = ErrorResponse(error=ErrorDetail(code=error.code, message=error.message))
        return JSONResponse(
            status_code=error.status_code,
            content=body.model_dump(),
            headers={"Cache-Control": "no-store"},
        )

    application.include_router(health.router)
    application.include_router(vma.router, prefix="/api/v1")
    return application


app = create_app()
