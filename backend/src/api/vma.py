"""Exposes VMA retrieval while keeping transport and structure validation separate."""

from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, Response
from pydantic import ValidationError

from src.api.dependencies import get_http_client, get_settings
from src.core.config import Settings
from src.core.errors import UpstreamError
from src.models.errors import ErrorResponse
from src.models.vma import VmaResponse
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
    """Returns a structurally validated VMA object array, including a successful empty list.

    Fetches Swedish messages for all counties using the configured upstream URL.
    Raises UpstreamError if retrieval or structural validation fails.
    Message fields remain unvalidated and must not be rendered as trusted HTML.
    """
    payload = await fetch_vma_response(client, settings)
    try:
        result = VmaResponse.model_validate(payload)
    except ValidationError as error:
        raise UpstreamError(
            "upstream_invalid_response",
            "Källan för VMA-meddelanden gav ett ogiltigt svar.",
        ) from error

    response.headers["Cache-Control"] = "no-store"
    return result
