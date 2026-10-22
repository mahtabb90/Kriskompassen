"""Fetches civil-defense shelters from MCF's WFS and maps them to a stable public shape."""

import asyncio
import math
from collections.abc import AsyncIterator
from typing import NoReturn
from urllib.parse import urlsplit, urlunsplit

import httpx

from src.core.config import Settings
from src.core.errors import UpstreamError
from src.models.shelter import Shelter, ShelterListResponse, ShelterSource

WFS_TYPE_NAME = "skyddsrum:US_civilProtectionSite"
# Widens the search until MIN_RESULTS shelters are found or the last step is reached. Tuned for
# plausible Swedish shelter density, not derived from real density data - worth revisiting if a
# sparse rural municipality turns out to need a wider net.
RADIUS_STEPS_METERS: tuple[int, ...] = (2_000, 4_000, 8_000, 16_000, 32_000, 50_000)
MIN_RESULTS = 5
# Bounds worst-case latency/payload for a single dense-city BBOX; a radius step that still needs
# more than this many pages is treated as exhausted rather than fetched to completion.
MAX_PAGES = 2
PAGE_SIZE = 200
# WGS84 degrees-to-meters approximation, fine at this resolution for bounding a search radius.
METERS_PER_DEGREE_LATITUDE = 111_320.0


def _reject_json_constant(value: str) -> NoReturn:
    raise ValueError(f"Non-JSON numeric constant: {value}")


def _parse_json_float(value: str) -> float:
    number = float(value)
    if not math.isfinite(number):
        raise ValueError("JSON number exceeds the supported finite range.")
    return number


def _public_shelters_url(settings: Settings) -> str:
    """Strips credentials, query parameters and fragments from the configured endpoint."""
    parsed = urlsplit(str(settings.shelters_api_url))
    return urlunsplit((parsed.scheme, parsed.netloc.rsplit("@", 1)[-1], parsed.path, "", ""))


def _bbox_for_radius(
    lat: float, lon: float, radius_meters: float
) -> tuple[float, float, float, float]:
    """Returns a (minLon, minLat, maxLon, maxLat) WGS84 box of the given radius around a point."""
    delta_lat = radius_meters / METERS_PER_DEGREE_LATITUDE
    # Guards the cosine term near the poles; no Swedish shelter is anywhere near one.
    cos_lat = max(math.cos(math.radians(lat)), 1e-6)
    delta_lon = radius_meters / (METERS_PER_DEGREE_LATITUDE * cos_lat)
    return (lon - delta_lon, lat - delta_lat, lon + delta_lon, lat + delta_lat)


def _first_point(coordinates: object) -> tuple[float, float] | None:
    """Extracts the first (lon, lat) pair from a MultiPoint geometry's coordinate array."""
    if not isinstance(coordinates, list) or not coordinates:
        return None
    first = coordinates[0]
    if (
        not isinstance(first, list)
        or len(first) != 2
        or not all(isinstance(value, int | float) for value in first)
    ):
        return None
    lon, lat = first
    if not (math.isfinite(lon) and math.isfinite(lat)):
        return None
    return float(lon), float(lat)


def _map_feature(feature: object) -> Shelter | None:
    """Maps one WFS GeoJSON feature to a Shelter, or None if a required field is missing.

    A malformed feature (missing geometry or id) is skipped rather than failing the whole
    request, since one bad record should not hide every other shelter in the same response.
    """
    if not isinstance(feature, dict):
        return None
    properties = feature.get("properties")
    geometry = feature.get("geometry")
    if not isinstance(properties, dict) or not isinstance(geometry, dict):
        return None

    inspire_id = properties.get("inspireid")
    point = _first_point(geometry.get("coordinates"))
    if not isinstance(inspire_id, str) or not inspire_id or point is None:
        return None
    lon, lat = point

    number = properties.get("name")
    address = properties.get("additionallocationdescription")
    capacity = properties.get("numberofoccupants")
    shelter_type = properties.get("statustype")
    return Shelter(
        id=inspire_id,
        number=number if isinstance(number, str) and number else None,
        address=address if isinstance(address, str) and address else None,
        lat=lat,
        lon=lon,
        capacity=capacity if isinstance(capacity, int) and not isinstance(capacity, bool) else None,
        type=shelter_type if isinstance(shelter_type, str) and shelter_type else None,
    )


def _next_page_url(payload: dict) -> str | None:
    links = payload.get("links")
    if not isinstance(links, list):
        return None
    for link in links:
        if (
            isinstance(link, dict)
            and link.get("rel") == "next"
            and isinstance(link.get("href"), str)
        ):
            return link["href"]
    return None


async def _fetch_wfs_payload(
    client: httpx.AsyncClient,
    settings: Settings,
    url: str,
    params: dict[str, object] | None,
) -> object:
    """Fetches one WFS page and decodes JSON within the configured time budget.

    Raises UpstreamError on timeout, transport failure, non-success HTTP, or invalid JSON.
    """
    try:
        async with asyncio.timeout(settings.shelters_timeout_seconds):
            response = await client.get(
                url,
                params=params,
                headers={"Accept": "application/json"},
                timeout=settings.shelters_timeout_seconds,
                follow_redirects=False,
            )
            if not response.is_success:
                raise UpstreamError(
                    "upstream_http_error",
                    "Källan för skyddsrumsdata svarade med ett fel.",
                )
            try:
                return response.json(
                    parse_constant=_reject_json_constant,
                    parse_float=_parse_json_float,
                )
            except (ValueError, UnicodeDecodeError) as error:
                raise UpstreamError(
                    "upstream_invalid_response",
                    "Källan för skyddsrumsdata gav ett ogiltigt svar.",
                ) from error
    except (TimeoutError, httpx.TimeoutException) as error:
        raise UpstreamError(
            "upstream_timeout",
            "Hämtning av skyddsrumsdata tog för lång tid.",
            status_code=504,
        ) from error
    except httpx.RequestError as error:
        raise UpstreamError(
            "upstream_network_error",
            "Kunde inte ansluta till källan för skyddsrumsdata.",
        ) from error


async def _fetch_features(
    client: httpx.AsyncClient,
    settings: Settings,
    bbox: tuple[float, float, float, float],
) -> AsyncIterator[dict]:
    """Yields every feature in one BBOX's WFS result, following pagination up to MAX_PAGES."""
    min_lon, min_lat, max_lon, max_lat = bbox
    url = str(settings.shelters_api_url)
    params: dict[str, object] | None = {
        "service": "WFS",
        "version": "2.0.0",
        "request": "GetFeature",
        "typeNames": WFS_TYPE_NAME,
        "outputFormat": "application/json",
        "srsName": "EPSG:4326",
        "bbox": f"{min_lon},{min_lat},{max_lon},{max_lat},EPSG:4326",
        "count": PAGE_SIZE,
    }
    for _ in range(MAX_PAGES):
        payload = await _fetch_wfs_payload(client, settings, url, params)
        if not isinstance(payload, dict):
            return
        features = payload.get("features")
        if isinstance(features, list):
            for feature in features:
                yield feature
        next_url = _next_page_url(payload)
        if next_url is None:
            return
        # The next-page link already carries every query parameter it needs.
        url, params = next_url, None


async def fetch_nearest_shelters(
    client: httpx.AsyncClient, settings: Settings, lat: float, lon: float
) -> tuple[list[Shelter], int]:
    """Widens the search radius around (lat, lon) until MIN_RESULTS shelters are found.

    Returns the shelters found and the radius (meters) the search stopped at. An empty result
    after the widest radius is a valid "none nearby" outcome, not an UpstreamError.
    """
    shelters_by_id: dict[str, Shelter] = {}
    radius_used = RADIUS_STEPS_METERS[-1]
    for radius_used in RADIUS_STEPS_METERS:
        shelters_by_id = {}
        bbox = _bbox_for_radius(lat, lon, radius_used)
        async for feature in _fetch_features(client, settings, bbox):
            shelter = _map_feature(feature)
            if shelter is not None:
                shelters_by_id[shelter.id] = shelter
        if len(shelters_by_id) >= MIN_RESULTS:
            break
    return list(shelters_by_id.values()), radius_used


async def fetch_shelters_response(
    client: httpx.AsyncClient, settings: Settings, lat: float, lon: float
) -> ShelterListResponse:
    """Builds the full attributed response for the nearest shelters to one position."""
    shelters, radius_used = await fetch_nearest_shelters(client, settings, lat, lon)
    return ShelterListResponse(
        shelters=shelters,
        source=ShelterSource(apiUrl=_public_shelters_url(settings)),
        bboxRadiusMetersUsed=radius_used,
    )
