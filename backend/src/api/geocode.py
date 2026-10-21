"""Exposes reverse geocoding as a single on-demand lookup, not a polled feed."""

from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, Query, Response

from src.api.dependencies import (
    get_geocode_cache,
    get_geocode_search_cache,
    get_http_client,
    get_settings,
)
from src.core.config import Settings
from src.models.errors import ErrorResponse
from src.models.geocode import GeocodeResponse, GeocodeSearchResponse
from src.services.geocode import fetch_geocode, search_geocode
from src.services.geocode_cache import GeocodeCache, GeocodeSearchCache

router = APIRouter(prefix="/geocode", tags=["geocode"])


@router.get(
    "",
    response_model=GeocodeResponse,
    responses={
        502: {"model": ErrorResponse, "description": "Upstream request or response failure."},
        503: {"model": ErrorResponse, "description": "Geocode queue is at capacity."},
        504: {"model": ErrorResponse, "description": "Upstream request timeout."},
    },
)
async def get_geocode(
    response: Response,
    lat: Annotated[float, Query(ge=-90, le=90)],
    lon: Annotated[float, Query(ge=-180, le=180)],
    client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    settings: Annotated[Settings, Depends(get_settings)],
    cache: Annotated[GeocodeCache, Depends(get_geocode_cache)],
) -> GeocodeResponse:
    """Reverse-geocodes one coordinate pair with provider attribution.

    found=False is a normal result for a position Nominatim cannot resolve; it is not an
    UpstreamError. Raises UpstreamError if the upstream request or response itself fails;
    a failed attempt is never cached. A repeated identical (lat, lon) lookup within the cache's
    TTL is served from memory; distinct lookups are throttled to Nominatim's ~1 request/second
    usage policy. If the queue of waiting/in-flight misses is already full, raises
    UpstreamError("geocode_queue_full", ..., status_code=503) immediately rather than growing
    the queue further, e.g. under a surge of distinct positions during a real crisis. This
    response is still always Cache-Control: no-store for the browser.
    """
    result = await cache.get_or_fetch(lat, lon, lambda: fetch_geocode(client, settings, lat, lon))
    response.headers["Cache-Control"] = "no-store"
    return result


@router.get(
    "/search",
    response_model=GeocodeSearchResponse,
    responses={
        502: {"model": ErrorResponse, "description": "Upstream request or response failure."},
        503: {"model": ErrorResponse, "description": "Geocode queue is at capacity."},
        504: {"model": ErrorResponse, "description": "Upstream request timeout."},
    },
)
async def search_geocode_endpoint(
    response: Response,
    q: Annotated[str, Query(min_length=1)],
    client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    settings: Annotated[Settings, Depends(get_settings)],
    cache: Annotated[GeocodeSearchCache, Depends(get_geocode_search_cache)],
) -> GeocodeSearchResponse:
    """Forward-geocodes free text (e.g. a manually typed address) into every plausible match.

    An empty candidate list is a normal result for text Nominatim cannot resolve; it is not an
    UpstreamError. Raises UpstreamError if the upstream request or response itself fails; a
    failed attempt is never cached. A repeated identical query within the cache's TTL is served
    from memory; distinct queries share the same ~1 request/second Nominatim throttle as reverse
    geocoding (see GeocodeSearchCache). This response is still always Cache-Control: no-store.
    """
    result = await cache.get_or_fetch(q, lambda: search_geocode(client, settings, q))
    response.headers["Cache-Control"] = "no-store"
    return result
