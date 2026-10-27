"""Makes application-scoped resources available to routers through dependency injection."""

import httpx
from fastapi import Request

from src.core.config import Settings
from src.services.geocode_cache import GeocodeCache, GeocodeSearchCache
from src.services.shelters import LocalShelterStore
from src.services.vma_cache import VmaCache


async def get_settings(request: Request) -> Settings:
    """Returns the settings validated when this application instance was created."""
    return request.app.state.settings


async def get_http_client(request: Request) -> httpx.AsyncClient:
    """Returns the shared client managed by the application's lifespan context."""
    return request.app.state.http_client


async def get_vma_cache(request: Request) -> VmaCache:
    """Returns the VMA cache shared by all requests to this application instance."""
    return request.app.state.vma_cache


async def get_geocode_cache(request: Request) -> GeocodeCache:
    """Returns the geocode cache shared by all requests to this application instance."""
    return request.app.state.geocode_cache


async def get_geocode_search_cache(request: Request) -> GeocodeSearchCache:
    """Returns the geocode search cache shared by all requests to this application instance."""
    return request.app.state.geocode_search_cache


async def get_shelter_store(request: Request) -> LocalShelterStore:
    """Returns the local shelter store shared by all requests to this application instance."""
    return request.app.state.shelter_store
