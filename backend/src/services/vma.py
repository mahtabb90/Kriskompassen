"""Retrieves JSON from Krisinformation.se without interpreting VMA message fields."""

import asyncio
import math
from typing import NoReturn

import httpx

from src.core.config import Settings
from src.core.errors import UpstreamError


def _reject_json_constant(value: str) -> NoReturn:
    raise ValueError(f"Non-JSON numeric constant: {value}")


def _parse_json_float(value: str) -> float:
    number = float(value)
    if not math.isfinite(number):
        raise ValueError("JSON number exceeds the supported finite range.")
    return number


async def fetch_vma_response(client: httpx.AsyncClient, settings: Settings) -> object:
    """Fetches one upstream response and decodes JSON within the configured time budget.

    Returns unvalidated JSON, including an empty array when the upstream returns one.
    Raises UpstreamError on timeout, transport failure, non-success HTTP, or invalid JSON.
    It neither retries failed requests nor substitutes cached or empty responses.
    """
    try:
        async with asyncio.timeout(settings.vma_timeout_seconds):
            response = await client.get(
                str(settings.vma_api_url),
                headers={"Accept": "application/json"},
                timeout=settings.vma_timeout_seconds,
                follow_redirects=False,
            )
            if not response.is_success:
                raise UpstreamError(
                    "upstream_http_error",
                    "Källan för VMA-meddelanden svarade med ett fel.",
                )

            try:
                return response.json(
                    parse_constant=_reject_json_constant,
                    parse_float=_parse_json_float,
                )
            except (ValueError, UnicodeDecodeError) as error:
                raise UpstreamError(
                    "upstream_invalid_response",
                    "Källan för VMA-meddelanden gav ett ogiltigt svar.",
                ) from error
    except (TimeoutError, httpx.TimeoutException) as error:
        raise UpstreamError(
            "upstream_timeout",
            "Hämtningen av VMA-meddelanden tog för lång tid.",
            status_code=504,
        ) from error
    except httpx.RequestError as error:
        raise UpstreamError(
            "upstream_network_error",
            "Kunde inte ansluta till källan för VMA-meddelanden.",
        ) from error
