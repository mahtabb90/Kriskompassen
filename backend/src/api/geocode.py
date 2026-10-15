"""Exposes reverse geocoding as a single on-demand lookup, not a polled feed."""

from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, Query, Response

from src.api.dependencies import get_http_client, get_settings
from src.core.config import Settings
from src.models.errors import ErrorResponse
from src.models.geocode import GeocodeResponse
from src.services.geocode import fetch_geocode

router = APIRouter(prefix="/geocode", tags=["geocode"])


@router.get(
    "",
    response_model=GeocodeResponse,
    responses={
        502: {"model": ErrorResponse, "description": "Upstream request or response failure."},
        504: {"model": ErrorResponse, "description": "Upstream request timeout."},
    },
)
async def get_geocode(
    response: Response,
    lat: Annotated[float, Query(ge=-90, le=90)],
    lon: Annotated[float, Query(ge=-180, le=180)],
    client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> GeocodeResponse:
    """Reverse-geocodes one coordinate pair with provider attribution.

    found=False is a normal result for a position Nominatim cannot resolve; it is not an
    UpstreamError. Raises UpstreamError if the upstream request or response itself fails.
    """
    result = await fetch_geocode(client, settings, lat, lon)
    response.headers["Cache-Control"] = "no-store"
    return result
