"""Checks the shelters transport boundary without contacting the public MCF WFS."""

import asyncio
from collections.abc import Awaitable, Callable

import httpx
import pytest

from src.api.dependencies import get_http_client
from src.app import create_app
from src.core.config import Settings
from src.services.shelters import RADIUS_STEPS_METERS

UpstreamHandler = Callable[[httpx.Request], httpx.Response | Awaitable[httpx.Response]]


def _feature(
    shelter_id: str,
    lon: float = 18.0,
    lat: float = 59.0,
    *,
    number: str | None = "120599-3",
    address: str | None = "Exempelgatan 1",
    capacity: int | None = 20,
    status_type: str | None = "Skyddsrum",
) -> dict:
    properties: dict[str, object] = {"inspireid": shelter_id}
    if number is not None:
        properties["name"] = number
    if address is not None:
        properties["additionallocationdescription"] = address
    if capacity is not None:
        properties["numberofoccupants"] = capacity
    if status_type is not None:
        properties["statustype"] = status_type
    return {
        "type": "Feature",
        "id": f"US_civilProtectionSite.{shelter_id}",
        "geometry": {"type": "MultiPoint", "coordinates": [[lon, lat]]},
        "properties": properties,
    }


def _collection(features: list[dict], *, next_href: str | None = None) -> dict:
    body: dict[str, object] = {
        "type": "FeatureCollection",
        "features": features,
        "totalFeatures": len(features),
    }
    if next_href is not None:
        body["links"] = [{"title": "next page", "rel": "next", "href": next_href}]
    return body


def _request_shelters(
    handler: UpstreamHandler,
    *,
    lat: float = 59.0,
    lon: float = 18.0,
    timeout_seconds: float = 1.0,
    upstream_url: str = "https://upstream.example/wfs",
) -> httpx.Response:
    async def run_request() -> httpx.Response:
        settings = Settings(
            shelters_api_url=upstream_url,
            shelters_timeout_seconds=timeout_seconds,
            cors_origins=[],
        )
        application = create_app(settings)
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as upstream:

            async def provide_upstream() -> httpx.AsyncClient:
                return upstream

            application.dependency_overrides[get_http_client] = provide_upstream
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=application),
                base_url="http://backend.example",
            ) as client:
                return await client.get("/api/v1/shelters/nearest", params={"lat": lat, "lon": lon})

    return asyncio.run(run_request())


def _assert_failure(response: httpx.Response, status: int, code: str) -> None:
    assert response.status_code == status
    assert response.headers["Cache-Control"] == "no-store"
    assert response.json()["error"]["code"] == code
    assert isinstance(response.json()["error"]["message"], str)
    assert response.json()["error"]["message"]


def test_maps_valid_feature() -> None:
    """Maps a complete WFS feature into the normalized Shelter shape."""
    # Five features satisfy MIN_RESULTS on the very first (smallest) radius step.
    features = [_feature(str(i), address="Kantarellen 11", capacity=200) for i in range(5)]
    response = _request_shelters(lambda _request: httpx.Response(200, json=_collection(features)))

    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store"
    body = response.json()
    assert len(body["shelters"]) == 5
    shelter = body["shelters"][0]
    assert shelter["number"] == "120599-3"
    assert shelter["address"] == "Kantarellen 11"
    assert shelter["capacity"] == 200
    assert shelter["type"] == "Skyddsrum"
    assert shelter["lat"] == pytest.approx(59.0)
    assert shelter["lon"] == pytest.approx(18.0)
    assert body["bboxRadiusMetersUsed"] == RADIUS_STEPS_METERS[0]
    assert body["source"]["apiName"] == "MCF WFS (OGC API Features)"
    assert body["source"]["apiUrl"] == "https://upstream.example/wfs"


def test_shelter_without_address_or_capacity_maps_to_null_fields() -> None:
    """Treats missing optional MCF fields as null rather than failing the whole feature."""
    features = [
        _feature(str(i), number=None, address=None, capacity=None, status_type=None)
        for i in range(5)
    ]
    response = _request_shelters(lambda _request: httpx.Response(200, json=_collection(features)))

    assert response.status_code == 200
    shelter = response.json()["shelters"][0]
    assert shelter["number"] is None
    assert shelter["address"] is None
    assert shelter["capacity"] is None
    assert shelter["type"] is None


def test_distinct_shelters_sharing_an_address_keep_their_own_number() -> None:
    """Keeps co-located shelters distinguishable by number even if everything else matches.

    MCF genuinely registers several separate shelters under one shared fastighetsbeteckning,
    sometimes with identical coordinates and capacity too - number is the only field that still
    tells them apart.
    """
    features = [
        _feature(str(i), number=f"16760{i}-0", address="Övra Runby 1:106", capacity=120)
        for i in range(5)
    ]
    response = _request_shelters(lambda _request: httpx.Response(200, json=_collection(features)))

    assert response.status_code == 200
    numbers = [shelter["number"] for shelter in response.json()["shelters"]]
    assert len(set(numbers)) == 5


def test_malformed_feature_is_skipped_without_failing_siblings() -> None:
    """Skips a feature missing geometry/id but still returns the valid siblings."""
    broken = {"type": "Feature", "properties": {"inspireid": "broken"}, "geometry": None}
    features = [broken, *(_feature(str(i)) for i in range(5))]
    response = _request_shelters(lambda _request: httpx.Response(200, json=_collection(features)))

    assert response.status_code == 200
    assert len(response.json()["shelters"]) == 5


def test_widens_radius_until_enough_shelters_are_found() -> None:
    """Re-queries with a wider BBOX until MIN_RESULTS shelters are found, then stops."""
    calls: list[httpx.Request] = []

    def upstream(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        # Too few on the first two (smallest) radius steps, enough on the third.
        count = 2 if len(calls) < 3 else 5
        return httpx.Response(
            200, json=_collection([_feature(f"{len(calls)}-{i}") for i in range(count)])
        )

    response = _request_shelters(upstream)

    assert response.status_code == 200
    assert len(calls) == 3
    body = response.json()
    assert len(body["shelters"]) == 5
    assert body["bboxRadiusMetersUsed"] == RADIUS_STEPS_METERS[2]


def test_still_under_min_results_after_last_radius_is_not_an_error() -> None:
    """Returns 200 with whatever was found once the widest radius is exhausted."""
    response = _request_shelters(
        lambda _request: httpx.Response(200, json=_collection([_feature("only-one")]))
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body["shelters"]) == 1
    assert body["bboxRadiusMetersUsed"] == RADIUS_STEPS_METERS[-1]


def test_no_shelters_nearby_is_not_an_error() -> None:
    """Returns an empty shelter list with 200, not an UpstreamError, for a sparse area."""
    response = _request_shelters(lambda _request: httpx.Response(200, json=_collection([])))

    assert response.status_code == 200
    assert response.json()["shelters"] == []


def test_follows_pagination_within_one_radius_step() -> None:
    """Follows a WFS 'next page' link and combines features from both pages."""
    next_url = "https://upstream.example/wfs?STARTINDEX=200"

    def upstream(request: httpx.Request) -> httpx.Response:
        if str(request.url) == next_url:
            return httpx.Response(200, json=_collection([_feature(f"page2-{i}") for i in range(3)]))
        return httpx.Response(
            200,
            json=_collection([_feature(f"page1-{i}") for i in range(2)], next_href=next_url),
        )

    response = _request_shelters(upstream)

    assert response.status_code == 200
    # 2 (page 1) + 3 (page 2) = 5, satisfying MIN_RESULTS at the first radius step.
    assert len(response.json()["shelters"]) == 5
    assert response.json()["bboxRadiusMetersUsed"] == RADIUS_STEPS_METERS[0]


def test_reports_upstream_http_failure_without_exposing_body() -> None:
    """Keeps an unsuccessful upstream response distinct from a successful empty-list outcome."""
    response = _request_shelters(
        lambda _request: httpx.Response(503, text="Private upstream diagnostics")
    )

    _assert_failure(response, 502, "upstream_http_error")
    assert "Private upstream diagnostics" not in response.text


def test_reports_network_failure() -> None:
    """Maps connection failures to the documented gateway error."""

    def fail_connection(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("Connection failed", request=request)

    response = _request_shelters(fail_connection)

    _assert_failure(response, 502, "upstream_network_error")


def test_reports_http_client_timeout() -> None:
    """Preserves the timeout status and code when HTTPX stops a request."""

    def time_out(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("Upstream timed out", request=request)

    response = _request_shelters(time_out)

    _assert_failure(response, 504, "upstream_timeout")


def test_rejects_invalid_json() -> None:
    """Rejects malformed JSON from the upstream WFS service."""
    response = _request_shelters(lambda _request: httpx.Response(200, content=b"{"))

    _assert_failure(response, 502, "upstream_invalid_response")


def test_omits_credentials_from_public_api_address() -> None:
    """Does not expose configured URL credentials through response metadata."""
    response = _request_shelters(
        lambda _request: httpx.Response(200, json=_collection([_feature("1")])),
        upstream_url="https://example-user:example-password@upstream.example/wfs",
    )

    assert response.status_code == 200
    assert response.json()["source"]["apiUrl"] == "https://upstream.example/wfs"
    assert "example-password" not in response.text


@pytest.mark.parametrize(
    ("params", "reason"),
    [
        ({"lon": "18.0"}, "missing lat"),
        ({"lat": "59.3"}, "missing lon"),
        ({"lat": "91", "lon": "18.0"}, "out-of-range lat"),
        ({"lat": "59.3", "lon": "181"}, "out-of-range lon"),
    ],
    ids=["missing-lat", "missing-lon", "out-of-range-lat", "out-of-range-lon"],
)
def test_rejects_invalid_query_params(params: dict[str, str], reason: str) -> None:
    """Rejects missing or out-of-range coordinates with FastAPI's own validation response."""

    def fail_if_called(_request: httpx.Request) -> httpx.Response:
        raise AssertionError("Query validation must fail before any upstream call.")

    async def run_request() -> httpx.Response:
        settings = Settings(cors_origins=[])
        application = create_app(settings)
        async with httpx.AsyncClient(transport=httpx.MockTransport(fail_if_called)) as upstream:

            async def provide_upstream() -> httpx.AsyncClient:
                return upstream

            application.dependency_overrides[get_http_client] = provide_upstream
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=application),
                base_url="http://backend.example",
            ) as client:
                return await client.get("/api/v1/shelters/nearest", params=params)

    response = asyncio.run(run_request())

    assert response.status_code == 422, reason


def test_default_upstream_is_mcf_wfs(monkeypatch: pytest.MonkeyPatch) -> None:
    """Uses MCF's public WFS endpoint without requiring an API key."""
    monkeypatch.delenv("KRISKOMPASSEN_SHELTERS_API_URL", raising=False)
    assert str(Settings().shelters_api_url) == "https://inspire.mcf.se/skyddsrum/wfs"
