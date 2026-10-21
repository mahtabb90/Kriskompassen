"""Creates the FastAPI application used by Uvicorn and the Vercel Python runtime."""

import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api import crisis, geocode, health, shelters, vma
from src.core.config import Settings
from src.core.errors import CrisisError, UpstreamError
from src.models.crisis import CrisisErrorDetail, CrisisErrorResponse
from src.models.errors import ErrorDetail, ErrorResponse
from src.services.geocode_cache import GeocodeCache, GeocodeSearchCache, NominatimThrottle
from src.services.shelters_cache import ShelterAreaCache
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
            "Sveriges Radio, reverse-geocodes positions through OpenStreetMap Nominatim and "
            "finds the nearest civil-defense shelters through MCF's open shelter data."
        ),
        lifespan=lifespan,
    )
    application.state.settings = app_settings
    application.state.vma_cache = VmaCache()
    # Shared across reverse and forward geocoding so Nominatim's ~1 request/second usage policy
    # applies to this app's combined traffic, not to each endpoint independently - see
    # GeocodeSearchCache's class doc.
    nominatim_throttle = NominatimThrottle(app_settings.geocode_min_interval_seconds)
    nominatim_lock = asyncio.Lock()
    application.state.geocode_cache = GeocodeCache(
        ttl_seconds=app_settings.geocode_cache_ttl_seconds,
        throttle=nominatim_throttle,
        max_queue_depth=app_settings.geocode_max_queue_depth,
        lock=nominatim_lock,
    )
    application.state.geocode_search_cache = GeocodeSearchCache(
        ttl_seconds=app_settings.geocode_cache_ttl_seconds,
        throttle=nominatim_throttle,
        max_queue_depth=app_settings.geocode_max_queue_depth,
        lock=nominatim_lock,
    )
    application.state.shelter_cache = ShelterAreaCache(
        ttl_seconds=app_settings.shelters_cache_ttl_seconds,
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
    application.include_router(shelters.router, prefix="/api/v1")
    return application


app = create_app()
