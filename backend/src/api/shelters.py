"""Exposes the nearest civil-defense shelters for one position as a single on-demand lookup."""

from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, Query, Response

from src.api.dependencies import get_http_client, get_settings, get_shelter_cache
from src.core.config import Settings
from src.models.errors import ErrorResponse
from src.models.shelter import ShelterListResponse
from src.services.shelters import fetch_shelters_response
from src.services.shelters_cache import ShelterAreaCache

router = APIRouter(prefix="/shelters", tags=["shelters"])


@router.get(
    "/nearest",
    response_model=ShelterListResponse,
    responses={
        502: {"model": ErrorResponse, "description": "Upstream request or response failure."},
        504: {"model": ErrorResponse, "description": "Upstream request timeout."},
    },
)
async def get_nearest_shelters(
    response: Response,
    lat: Annotated[float, Query(ge=-90, le=90)],
    lon: Annotated[float, Query(ge=-180, le=180)],
    client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    settings: Annotated[Settings, Depends(get_settings)],
    cache: Annotated[ShelterAreaCache, Depends(get_shelter_cache)],
) -> ShelterListResponse:
    """Returns the nearest civil-defense shelters found within a widening search radius.

    An empty shelter list is a normal result for a sparsely covered area; it is not an
    UpstreamError. Raises UpstreamError if the upstream WFS request or response itself fails.
    A lookup within the same grid cell as a recent request is served from memory instead of
    re-querying MCF.
    """
    result = await cache.get_or_fetch(
        lat, lon, lambda: fetch_shelters_response(client, settings, lat, lon)
    )
    response.headers["Cache-Control"] = "no-store"
    return result
