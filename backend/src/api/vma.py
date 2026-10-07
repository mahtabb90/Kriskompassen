"""Exposes VMA retrieval while keeping transport and structure validation separate."""

from typing import Annotated
from urllib.parse import urlsplit, urlunsplit

import httpx
from fastapi import APIRouter, Depends, Response
from pydantic import ValidationError

from src.api.dependencies import get_http_client, get_settings
from src.core.config import Settings
from src.core.errors import UpstreamError
from src.models.errors import ErrorResponse
from src.models.vma import UpstreamVmaResponse, VmaResponse, VmaSource
from src.services.vma import fetch_vma_response

router = APIRouter(prefix="/vmas", tags=["vma"])


@router.get(
    "",
    response_model=VmaResponse,
    responses={
        502: {"model": ErrorResponse, "description": "Upstream request or response failure."},
        504: {"model": ErrorResponse, "description": "Upstream request timeout."},
    },
)
async def get_vmas(
    response: Response,
    client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> VmaResponse:
    """Returns the SR feed with provider and API attribution, including empty feeds.

    Fetches all areas and languages; the frontend selects Swedish public VMA records.
    Raises UpstreamError if retrieval or structural validation fails.
    Entries remain unvalidated for per-record frontend validation and mapping.
    Message fields must not be rendered as trusted HTML.
    """
    payload = await fetch_vma_response(client, settings)
    try:
        result = UpstreamVmaResponse.model_validate(payload)
    except ValidationError as error:
        raise UpstreamError(
            "upstream_invalid_response",
            "Källan för VMA-meddelanden gav ett ogiltigt svar.",
        ) from error

    response.headers["Cache-Control"] = "no-store"
    upstream_url = urlsplit(str(settings.vma_api_url))
    # The UI needs the API's address, never credentials, query values or fragments.
    public_url = urlunsplit(
        (upstream_url.scheme, upstream_url.netloc.rsplit("@", 1)[-1], upstream_url.path, "", "")
    )
    return VmaResponse(**result.model_dump(), source=VmaSource(apiUrl=public_url))
