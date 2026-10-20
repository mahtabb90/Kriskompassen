"""Creates the FastAPI application used by Uvicorn and the Vercel Python runtime."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api import crisis, geocode, health, vma
from src.core.config import Settings
from src.core.errors import CrisisError, UpstreamError
from src.models.crisis import CrisisErrorDetail, CrisisErrorResponse
from src.models.errors import ErrorDetail, ErrorResponse
from src.services.geocode_cache import GeocodeCache, NominatimThrottle
from src.services.vma_cache import VmaCache

logger = logging.getLogger(__name__)


def create_app(settings: Settings | None = None) -> FastAPI:
    """Builds an independent application with validated settings and managed HTTP resources.

    Uses process environment settings when none are supplied. Invalid configuration raises
    a Pydantic validation error before the app serves requests. No upstream calls are made
    at import or startup; the shared client is opened and closed with the application.
    Each application owns its own in-memory VMA cache and geocode cache.
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
        description=(
            "Serves curated crisis preparedness articles, retrieves VMA information from "
            "Sveriges Radio and reverse-geocodes positions through OpenStreetMap Nominatim."
        ),
        lifespan=lifespan,
    )
    application.state.settings = app_settings
    application.state.vma_cache = VmaCache()
    application.state.geocode_cache = GeocodeCache(
        ttl_seconds=app_settings.geocode_cache_ttl_seconds,
        throttle=NominatimThrottle(app_settings.geocode_min_interval_seconds),
        max_queue_depth=app_settings.geocode_max_queue_depth,
    )
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
        logger.warning("Upstream request failed: %s", error.code)
        body = ErrorResponse(error=ErrorDetail(code=error.code, message=error.message))
        return JSONResponse(
            status_code=error.status_code,
            content=body.model_dump(),
            headers={"Cache-Control": "no-store"},
        )

    @application.exception_handler(CrisisError)
    async def handle_crisis_error(_request: Request, error: CrisisError) -> JSONResponse:
        """Returns readable article failures without exposing local files or their contents."""
        logger.warning("Crisis request failed: %s", error.code)
        body = CrisisErrorResponse(error=CrisisErrorDetail(code=error.code, message=error.message))
        return JSONResponse(
            status_code=error.status_code,
            content=body.model_dump(),
            headers={"Cache-Control": "no-store"},
        )

    application.include_router(health.router)
    application.include_router(crisis.router, prefix="/api/v1")
    application.include_router(vma.router, prefix="/api/v1")
    application.include_router(geocode.router, prefix="/api/v1")
    return application


app = create_app()
