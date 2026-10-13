"""Reverse-geocodes coordinates through Nominatim and normalizes the result."""

import asyncio
import math
from typing import NoReturn
from urllib.parse import urlsplit, urlunsplit

import httpx
from pydantic import ValidationError

from src.core.config import Settings
from src.core.errors import UpstreamError
from src.models.geocode import GeocodeResponse, GeocodeSource, UpstreamGeocodeResult

_NOT_FOUND_MESSAGE = "Ingen adress kunde hittas för den angivna positionen."
_MUNICIPALITY_KEYS = ("municipality", "city", "town", "village")
_COUNTY_KEYS = ("county", "state")


def _reject_json_constant(value: str) -> NoReturn:
    raise ValueError(f"Non-JSON numeric constant: {value}")


def _parse_json_float(value: str) -> float:
    number = float(value)
    if not math.isfinite(number):
        raise ValueError("JSON number exceeds the supported finite range.")
    return number


def _public_geocode_url(settings: Settings) -> str:
    """Strips credentials, query parameters and fragments from the configured endpoint."""
    parsed = urlsplit(str(settings.geocode_api_url))
    return urlunsplit((parsed.scheme, parsed.netloc.rsplit("@", 1)[-1], parsed.path, "", ""))


def _first_address_value(address: dict[str, str], keys: tuple[str, ...]) -> str | None:
    for key in keys:
        value = address.get(key)
        if value:
            return value
    return None


async def _fetch_geocode_payload(
    client: httpx.AsyncClient, settings: Settings, lat: float, lon: float
) -> object:
    """Fetches one upstream response and decodes JSON within the configured time budget.

    Returns unvalidated JSON. Raises UpstreamError on timeout, transport failure, non-success
    HTTP, or invalid JSON. A structurally valid "no result" response is not an error here;
    classifying it happens in fetch_geocode.
    """
    try:
        async with asyncio.timeout(settings.geocode_timeout_seconds):
            response = await client.get(
                str(settings.geocode_api_url),
                params={
                    "format": "jsonv2",
                    "lat": lat,
                    "lon": lon,
                    "zoom": 18,
                    "addressdetails": 1,
                    "accept-language": "sv",
                },
                headers={
                    "Accept": "application/json",
                    "User-Agent": settings.geocode_user_agent,
                },
                timeout=settings.geocode_timeout_seconds,
                follow_redirects=False,
            )
            if not response.is_success:
                raise UpstreamError(
                    "upstream_http_error",
                    "Källan för adressuppslag svarade med ett fel.",
                )

            try:
                return response.json(
                    parse_constant=_reject_json_constant,
                    parse_float=_parse_json_float,
                )
            except (ValueError, UnicodeDecodeError) as error:
                raise UpstreamError(
                    "upstream_invalid_response",
                    "Källan för adressuppslag gav ett ogiltigt svar.",
                ) from error
    except (TimeoutError, httpx.TimeoutException) as error:
        raise UpstreamError(
            "upstream_timeout",
            "Adressuppslaget tog för lång tid.",
            status_code=504,
        ) from error
    except httpx.RequestError as error:
        raise UpstreamError(
            "upstream_network_error",
            "Kunde inte ansluta till källan för adressuppslag.",
        ) from error


async def fetch_geocode(
    client: httpx.AsyncClient, settings: Settings, lat: float, lon: float
) -> GeocodeResponse:
    """Reverse-geocodes one coordinate pair into a normalized, attributed response.

    Returns found=False, rather than raising, when Nominatim reports no result or returns
    a response that cannot be read as a complete address. Raises UpstreamError only for
    transport, timeout or JSON-decode failures.
    """
    payload = await _fetch_geocode_payload(client, settings, lat, lon)
    source = GeocodeSource(apiUrl=_public_geocode_url(settings))

    if not isinstance(payload, dict) or "error" in payload:
        return GeocodeResponse(found=False, message=_NOT_FOUND_MESSAGE, source=source)

    try:
        result = UpstreamGeocodeResult.model_validate(payload)
    except ValidationError:
        return GeocodeResponse(found=False, message=_NOT_FOUND_MESSAGE, source=source)

    return GeocodeResponse(
        found=True,
        address=result.display_name,
        municipality=_first_address_value(result.address, _MUNICIPALITY_KEYS),
        county=_first_address_value(result.address, _COUNTY_KEYS),
        lat=result.lat,
        lon=result.lon,
        source=source,
    )
