"""Exposes VMA retrieval while keeping transport and structure validation separate."""

from typing import Annotated
from urllib.parse import urlsplit, urlunsplit

import httpx
from fastapi import APIRouter, Depends, Response
from pydantic import ValidationError

from src.api.dependencies import get_http_client, get_settings, get_vma_cache
from src.core.config import Settings
from src.core.errors import UpstreamError
from src.models.errors import ErrorResponse
from src.models.vma import UpstreamVmaResponse, VmaCachedResponse, VmaResponse, VmaSource
from src.services.vma import fetch_vma_response
from src.services.vma_cache import VmaCache

router = APIRouter(prefix="/vmas", tags=["vma"])


async def _load_vma_response(client: httpx.AsyncClient, settings: Settings) -> VmaResponse:
    """Fetches and validates one SR feed envelope and adds backend-supplied attribution.

    Raises UpstreamError if retrieval or structural validation fails.
    """
    payload = await fetch_vma_response(client, settings)
    try:
        result = UpstreamVmaResponse.model_validate(payload)
    except ValidationError as error:
        raise UpstreamError(
            "upstream_invalid_response",
            "Källan för VMA-meddelanden gav ett ogiltigt svar.",
        ) from error

    upstream_url = urlsplit(str(settings.vma_api_url))
    # The UI needs the API's address, never credentials, query values or fragments.
    public_url = urlunsplit(
        (upstream_url.scheme, upstream_url.netloc.rsplit("@", 1)[-1], upstream_url.path, "", "")
    )
    return VmaResponse(**result.model_dump(), source=VmaSource(apiUrl=public_url))


@router.get(
    "",
    response_model=VmaCachedResponse,
    responses={
        502: {"model": ErrorResponse, "description": "Upstream request or response failure."},
        504: {"model": ErrorResponse, "description": "Upstream request timeout."},
    },
)
async def get_vmas(
    response: Response,
    client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    settings: Annotated[Settings, Depends(get_settings)],
    cache: Annotated[VmaCache, Depends(get_vma_cache)],
) -> VmaCachedResponse:
    """Returns the shared cached SR feed with attribution, check time and staleness.

    Fetches all areas and languages; the frontend selects Swedish public VMA records.
    SR is contacted only when the cache's latest attempt is older than its TTL. A fresh
    response may be reused by the browser for the remaining TTL; a stale one may not.
    Raises UpstreamError if the latest attempt failed and no successful feed is cached.
    Entries remain unvalidated for per-record frontend validation and mapping.
    Message fields must not be rendered as trusted HTML.
    """
    cached = await cache.get(lambda: _load_vma_response(client, settings))
    # No s-maxage: a CDN cache would add a second layer on top of the per-instance cache.
    response.headers["Cache-Control"] = (
        "no-store" if cached.stale else f"max-age={cached.max_age_seconds}"
    )
    return VmaCachedResponse(data=cached.data, checkedAt=cached.checked_at, stale=cached.stale)
