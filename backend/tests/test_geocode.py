"""Checks the geocode transport boundary without contacting the public Nominatim API."""

import asyncio
from collections.abc import AsyncIterator, Awaitable, Callable

import httpx
import pytest

from src.api.dependencies import get_http_client
from src.app import create_app
from src.core.config import Settings

UpstreamHandler = Callable[[httpx.Request], httpx.Response | Awaitable[httpx.Response]]

NOMINATIM_RESULT = {
    "place_id": 12345,
    "licence": "Data © OpenStreetMap contributors, ODbL 1.0",
    "osm_type": "way",
    "osm_id": 987654,
    "lat": "59.334591",
    "lon": "18.063240",
    "display_name": "Drottninggatan 1, 111 51 Stockholm, Sverige",
    "address": {
        "road": "Drottninggatan",
        "city": "Stockholm",
        "municipality": "Stockholm kommun",
        "county": "Stockholms län",
        "postcode": "111 51",
        "country": "Sverige",
        "country_code": "se",
    },
    "boundingbox": ["59.3345", "59.3347", "18.0631", "18.0634"],
}


def _request_geocode(
    handler: UpstreamHandler,
    *,
    lat: float = 59.334591,
    lon: float = 18.06324,
    timeout_seconds: float = 1.0,
    upstream_url: str = "https://upstream.example/reverse",
) -> httpx.Response:
    async def run_request() -> httpx.Response:
        settings = Settings(
            geocode_api_url=upstream_url,
            geocode_timeout_seconds=timeout_seconds,
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
                return await client.get("/api/v1/geocode", params={"lat": lat, "lon": lon})

    return asyncio.run(run_request())


def _assert_failure(response: httpx.Response, status: int, code: str) -> None:
    assert response.status_code == status
    assert response.headers["Cache-Control"] == "no-store"
    assert response.json()["error"]["code"] == code
    assert isinstance(response.json()["error"]["message"], str)
    assert response.json()["error"]["message"]


def test_maps_valid_result() -> None:
    """Maps a complete Nominatim result into the normalized, attributed response shape."""
    response = _request_geocode(lambda _request: httpx.Response(200, json=NOMINATIM_RESULT))

    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store"
    body = response.json()
    assert body["found"] is True
    assert body["address"] == "Drottninggatan 1, 111 51 Stockholm, Sverige"
    assert body["municipality"] == "Stockholm kommun"
    assert body["county"] == "Stockholms län"
    assert body["lat"] == pytest.approx(59.334591)
    assert body["lon"] == pytest.approx(18.063240)
    assert body["source"]["apiName"] == "Nominatim"
    assert body["source"]["apiUrl"] == "https://upstream.example/reverse"


@pytest.mark.parametrize("fallback_key", ["city", "town", "village"])
def test_maps_municipality_fallback_chain(fallback_key: str) -> None:
    """Falls back to city/town/village when Nominatim omits a municipality field."""
    address = {
        key: value
        for key, value in NOMINATIM_RESULT["address"].items()
        if key not in ("municipality", "city")
    }
    address[fallback_key] = "Exempelby"
    payload = {**NOMINATIM_RESULT, "address": address}

    response = _request_geocode(lambda _request: httpx.Response(200, json=payload))

    assert response.status_code == 200
    assert response.json()["municipality"] == "Exempelby"


def test_reports_not_found_for_upstream_error_shape() -> None:
    """Treats Nominatim's documented no-result shape as a normal outcome, not a failure."""
    response = _request_geocode(
        lambda _request: httpx.Response(200, json={"error": "Unable to geocode"})
    )

    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store"
    body = response.json()
    assert body["found"] is False
    assert isinstance(body["message"], str)
    assert body["message"]
    assert body["address"] is None


@pytest.mark.parametrize(
    "payload",
    [
        {"lat": "59.3", "lon": "18.0"},
        {"display_name": "Somewhere"},
        {"lat": "not-a-number", "lon": "18.0", "display_name": "Somewhere"},
        [],
        "message",
        17,
    ],
)
def test_reports_not_found_for_incomplete_payload(payload: object) -> None:
    """Treats a structurally incomplete 2xx response as no result, not an upstream failure."""
    response = _request_geocode(lambda _request: httpx.Response(200, json=payload))

    assert response.status_code == 200
    assert response.json()["found"] is False


@pytest.mark.parametrize("body", [b"{", b"[NaN]", b"[Infinity]", b"[1e999]"])
def test_rejects_invalid_or_unrepresentable_json(body: bytes) -> None:
    """Rejects malformed JSON and numbers that cannot be preserved as finite JSON values."""
    response = _request_geocode(lambda _request: httpx.Response(200, content=body))

    _assert_failure(response, 502, "upstream_invalid_response")


def test_reports_upstream_http_failure_without_exposing_body() -> None:
    """Keeps an unsuccessful upstream response distinct from a successful no-result outcome."""
    response = _request_geocode(
        lambda _request: httpx.Response(503, text="Private upstream diagnostics")
    )

    _assert_failure(response, 502, "upstream_http_error")
    assert "Private upstream diagnostics" not in response.text


def test_reports_network_failure() -> None:
    """Maps connection failures to the documented gateway error."""

    def fail_connection(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("Connection failed", request=request)

    response = _request_geocode(fail_connection)

    _assert_failure(response, 502, "upstream_network_error")


def test_reports_http_client_timeout() -> None:
    """Preserves the timeout status and code when HTTPX stops a request."""

    def time_out(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("Upstream timed out", request=request)

    response = _request_geocode(time_out)

    _assert_failure(response, 504, "upstream_timeout")


def test_total_deadline_cancels_wait_for_headers() -> None:
    """Applies the total request budget even when a transport never returns headers."""
    cancelled = []

    async def wait_for_headers(_request: httpx.Request) -> httpx.Response:
        try:
            await asyncio.Event().wait()
        finally:
            cancelled.append(True)
        return httpx.Response(200, json=NOMINATIM_RESULT)

    response = _request_geocode(wait_for_headers, timeout_seconds=0.01)

    _assert_failure(response, 504, "upstream_timeout")
    assert cancelled == [True]


def test_total_deadline_cancels_incomplete_body() -> None:
    """Keeps the deadline active during body reads and releases the response stream."""

    class IncompleteBody(httpx.AsyncByteStream):
        """Emits a partial JSON object and waits until the request is cancelled."""

        def __init__(self) -> None:
            """Records whether HTTPX released the response stream."""
            self.closed = False

        async def __aiter__(self) -> AsyncIterator[bytes]:
            """Yields an incomplete body and leaves completion to the request deadline."""
            yield b"{"
            await asyncio.Event().wait()

        async def aclose(self) -> None:
            """Records stream cleanup after cancellation."""
            self.closed = True

    body = IncompleteBody()
    response = _request_geocode(
        lambda _request: httpx.Response(200, stream=body),
        timeout_seconds=0.01,
    )

    _assert_failure(response, 504, "upstream_timeout")
    assert body.closed


def test_omits_credentials_from_public_api_address() -> None:
    """Does not expose configured URL credentials through response metadata."""
    response = _request_geocode(
        lambda _request: httpx.Response(200, json=NOMINATIM_RESULT),
        upstream_url="https://example-user:example-password@upstream.example/reverse",
    )
    assert response.status_code == 200
    assert response.json()["source"]["apiUrl"] == "https://upstream.example/reverse"
    assert "example-user" not in response.text
    assert "example-password" not in response.text


def test_strips_query_and_fragment_from_public_api_address() -> None:
    """Does not expose configured query parameters or fragments through response metadata."""
    response = _request_geocode(
        lambda _request: httpx.Response(200, json=NOMINATIM_RESULT),
        upstream_url="https://upstream.example/reverse?private=value#fragment",
    )
    assert response.status_code == 200
    assert response.json()["source"]["apiUrl"] == "https://upstream.example/reverse"
    assert "private" not in response.text
    assert "fragment" not in response.text


def test_sends_identifying_user_agent_and_no_credentials() -> None:
    """Sends the configured User-Agent and no browser credentials to the upstream API."""

    def upstream(request: httpx.Request) -> httpx.Response:
        assert request.headers["Accept"] == "application/json"
        assert request.headers["User-Agent"] == (
            "KrisKompassen/0.1 (+https://github.com/mahtabb90/Kriskompassen)"
        )
        assert "Authorization" not in request.headers
        assert "Cookie" not in request.headers
        return httpx.Response(200, json=NOMINATIM_RESULT)

    response = _request_geocode(upstream)

    assert response.status_code == 200


@pytest.mark.parametrize(
    ("params", "reason"),
    [
        ({"lon": "18.0"}, "missing lat"),
        ({"lat": "59.3"}, "missing lon"),
        ({"lat": "not-a-number", "lon": "18.0"}, "non-numeric lat"),
        ({"lat": "91", "lon": "18.0"}, "out-of-range lat"),
        ({"lat": "59.3", "lon": "181"}, "out-of-range lon"),
    ],
    ids=["missing-lat", "missing-lon", "non-numeric-lat", "out-of-range-lat", "out-of-range-lon"],
)
def test_rejects_invalid_query_params(params: dict[str, str], reason: str) -> None:
    """Rejects missing or out-of-range coordinates with FastAPI's own validation response.

    This 422 {"detail": [...]} shape intentionally differs from the {"error": {...}} envelope
    used for upstream failures; see DEVELOPMENT.md.
    """

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
                return await client.get("/api/v1/geocode", params=params)

    response = asyncio.run(run_request())

    assert response.status_code == 422, reason
    assert "detail" in response.json()


def test_default_upstream_is_nominatim(monkeypatch: pytest.MonkeyPatch) -> None:
    """Uses the public Nominatim reverse endpoint without requiring an API key."""
    monkeypatch.delenv("KRISKOMPASSEN_GEOCODE_API_URL", raising=False)
    assert str(Settings().geocode_api_url) == "https://nominatim.openstreetmap.org/reverse"


NOMINATIM_SEARCH_RESULTS = [
    NOMINATIM_RESULT,
    {
        **NOMINATIM_RESULT,
        "lat": "59.858500",
        "lon": "17.638927",
        "display_name": "Drottninggatan 1, 753 10 Uppsala, Sverige",
        "address": {
            **NOMINATIM_RESULT["address"],
            "city": "Uppsala",
            "municipality": "Uppsala kommun",
        },
    },
]


def _request_geocode_search(
    handler: UpstreamHandler,
    *,
    q: str = "Storgatan 1",
    timeout_seconds: float = 1.0,
    upstream_url: str = "https://upstream.example/search",
) -> httpx.Response:
    async def run_request() -> httpx.Response:
        settings = Settings(
            geocode_search_api_url=upstream_url,
            geocode_timeout_seconds=timeout_seconds,
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
                return await client.get("/api/v1/geocode/search", params={"q": q})

    return asyncio.run(run_request())


def test_search_maps_every_candidate() -> None:
    """Maps each array entry from Nominatim's search result into a candidate."""
    response = _request_geocode_search(
        lambda _request: httpx.Response(200, json=NOMINATIM_SEARCH_RESULTS)
    )

    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store"
    body = response.json()
    assert len(body["candidates"]) == 2
    assert body["candidates"][0]["address"] == "Drottninggatan 1, 111 51 Stockholm, Sverige"
    assert body["candidates"][0]["municipality"] == "Stockholm kommun"
    assert body["candidates"][1]["municipality"] == "Uppsala kommun"
    assert body["source"]["apiName"] == "Nominatim"


def test_search_sends_query_and_restricts_to_sweden() -> None:
    """Sends the typed query and restricts results to Sweden."""

    def upstream(request: httpx.Request) -> httpx.Response:
        assert request.url.params["q"] == "Storgatan 1, Uppsala"
        assert request.url.params["countrycodes"] == "se"
        assert request.url.params["limit"] == "5"
        return httpx.Response(200, json=[])

    response = _request_geocode_search(upstream, q="Storgatan 1, Uppsala")

    assert response.status_code == 200


def test_search_returns_empty_candidates_for_no_match() -> None:
    """Treats an empty result array as a normal outcome, not an UpstreamError."""
    response = _request_geocode_search(lambda _request: httpx.Response(200, json=[]))

    assert response.status_code == 200
    assert response.json()["candidates"] == []


def test_search_skips_a_malformed_candidate_without_failing_siblings() -> None:
    """Skips one entry that fails validation but still returns the valid siblings."""
    broken = {**NOMINATIM_RESULT, "lat": "not-a-number"}
    response = _request_geocode_search(
        lambda _request: httpx.Response(200, json=[broken, NOMINATIM_SEARCH_RESULTS[1]])
    )

    assert response.status_code == 200
    assert len(response.json()["candidates"]) == 1


def test_search_reports_upstream_http_failure() -> None:
    """Reports an unsuccessful upstream response as a gateway failure."""
    response = _request_geocode_search(
        lambda _request: httpx.Response(503, text="Private upstream diagnostics")
    )

    _assert_failure(response, 502, "upstream_http_error")


def test_search_rejects_an_empty_query() -> None:
    """Rejects an empty query with FastAPI's own validation response, before any upstream call."""

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
                return await client.get("/api/v1/geocode/search", params={"q": ""})

    response = asyncio.run(run_request())

    assert response.status_code == 422


def test_default_search_upstream_is_nominatim(monkeypatch: pytest.MonkeyPatch) -> None:
    """Uses the public Nominatim search endpoint without requiring an API key."""
    monkeypatch.delenv("KRISKOMPASSEN_GEOCODE_SEARCH_API_URL", raising=False)
    assert str(Settings().geocode_search_api_url) == "https://nominatim.openstreetmap.org/search"
