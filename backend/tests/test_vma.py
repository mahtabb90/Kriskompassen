"""Checks the VMA transport boundary without contacting the public upstream API."""

import asyncio
import json
from collections.abc import AsyncIterator, Awaitable, Callable

import httpx
import pytest

from src.api.dependencies import get_http_client
from src.app import create_app
from src.core.config import Settings

UpstreamHandler = Callable[[httpx.Request], httpx.Response | Awaitable[httpx.Response]]

VMA_RECORD = {
    "identifier": "example-vma-1",
    "status": "Actual",
    "msgType": "Alert",
    "info": [{"language": "sv-SE", "description": "Håll dig inomhus."}],
    "extra": {"preserved": True},
}


def _request_vmas(
    handler: UpstreamHandler,
    timeout_seconds: float = 1.0,
    upstream_url: str = "https://upstream.example/vmas",
) -> httpx.Response:
    async def run_request() -> httpx.Response:
        settings = Settings(
            vma_api_url=upstream_url,
            vma_timeout_seconds=timeout_seconds,
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
                return await client.get("/api/v1/vmas")

    return asyncio.run(run_request())


def _assert_failure(response: httpx.Response, status: int, code: str) -> None:
    assert response.status_code == status
    assert response.headers["Cache-Control"] == "no-store"
    assert response.json()["error"]["code"] == code
    assert isinstance(response.json()["error"]["message"], str)
    assert response.json()["error"]["message"]


@pytest.mark.parametrize(
    "payload",
    [
        [],
        [VMA_RECORD],
        [VMA_RECORD, None, 7, "invalid record", True, ["nested array"], VMA_RECORD],
        [None, False],
    ],
    ids=["empty", "object", "mixed-records", "no-object-records"],
)
def test_preserves_json_arrays_for_per_record_validation(payload: list[object]) -> None:
    """Preserves invalid records for frontend classification without dropping valid ones."""
    envelope = {"timestamp": "2026-10-05T12:00:00Z", "alerts": payload}
    response = _request_vmas(lambda _request: httpx.Response(200, json=envelope))

    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store"
    assert response.json()["alerts"] == payload
    assert response.json()["timestamp"] == envelope["timestamp"]
    assert response.json()["source"]["name"] == "Sveriges Radio"
    assert response.json()["source"]["apiUrl"] == "https://upstream.example/vmas"


@pytest.mark.parametrize(
    "payload",
    [
        {"alerts": []},
        [],
        "message",
        None,
        17,
        False,
        {"timestamp": "2026-10-05T12:00:00Z", "alerts": None},
        {"timestamp": "2026-10-05T12:00:00Z", "alerts": {}},
        {"timestamp": "invalid", "alerts": []},
        {"timestamp": "2026-10-05T12:00:00", "alerts": []},
    ],
)
def test_rejects_invalid_envelope(payload: object) -> None:
    """Rejects an invalid envelope instead of turning it into a successful empty result."""
    response = _request_vmas(lambda _request: httpx.Response(200, content=json.dumps(payload)))

    _assert_failure(response, 502, "upstream_invalid_response")


@pytest.mark.parametrize("body", [b"{", b"[NaN]", b"[Infinity]", b"[1e999]"])
def test_rejects_invalid_or_unrepresentable_json(body: bytes) -> None:
    """Rejects malformed JSON and numbers that cannot be preserved as finite JSON values."""
    response = _request_vmas(lambda _request: httpx.Response(200, content=body))

    _assert_failure(response, 502, "upstream_invalid_response")


def test_reports_upstream_http_failure_without_exposing_body() -> None:
    """Keeps an unsuccessful upstream response distinct from a successful empty list."""
    response = _request_vmas(
        lambda _request: httpx.Response(503, text="Private upstream diagnostics")
    )

    _assert_failure(response, 502, "upstream_http_error")
    assert "Private upstream diagnostics" not in response.text


def test_reports_network_failure() -> None:
    """Maps connection failures to the documented gateway error."""

    def fail_connection(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("Connection failed", request=request)

    response = _request_vmas(fail_connection)

    _assert_failure(response, 502, "upstream_network_error")


def test_reports_http_client_timeout() -> None:
    """Preserves the timeout status and code when HTTPX stops a request."""

    def time_out(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("Upstream timed out", request=request)

    response = _request_vmas(time_out)

    _assert_failure(response, 504, "upstream_timeout")


def test_total_deadline_cancels_wait_for_headers() -> None:
    """Applies the total request budget even when a transport never returns headers."""
    cancelled = []

    async def wait_for_headers(_request: httpx.Request) -> httpx.Response:
        try:
            await asyncio.Event().wait()
        finally:
            cancelled.append(True)
        return httpx.Response(200, json=[])

    response = _request_vmas(wait_for_headers, timeout_seconds=0.01)

    _assert_failure(response, 504, "upstream_timeout")
    assert cancelled == [True]


def test_total_deadline_cancels_incomplete_body() -> None:
    """Keeps the deadline active during body reads and releases the response stream."""

    class IncompleteBody(httpx.AsyncByteStream):
        """Emits a partial JSON array and waits until the request is cancelled."""

        def __init__(self) -> None:
            """Records whether HTTPX released the response stream."""
            self.closed = False

        async def __aiter__(self) -> AsyncIterator[bytes]:
            """Yields an incomplete body and leaves completion to the request deadline."""
            yield b"["
            await asyncio.Event().wait()

        async def aclose(self) -> None:
            """Records stream cleanup after cancellation."""
            self.closed = True

    body = IncompleteBody()
    response = _request_vmas(
        lambda _request: httpx.Response(200, stream=body),
        timeout_seconds=0.01,
    )

    _assert_failure(response, 504, "upstream_timeout")
    assert body.closed


def test_reports_source_even_for_empty_feed_and_ignores_upstream_attribution() -> None:
    """Supplies attribution from backend configuration, never upstream-supplied metadata."""

    def upstream(request: httpx.Request) -> httpx.Response:
        assert request.headers["Accept"] == "application/json"
        assert "Authorization" not in request.headers
        assert "Cookie" not in request.headers
        return httpx.Response(
            200,
            json={
                "timestamp": "2026-10-05T12:00:00Z",
                "alerts": [],
                "source": {"name": "Untrusted provider"},
            },
        )

    response = _request_vmas(
        upstream,
        upstream_url="https://vmaapi.sr.se/testapi/v3/examples/data?private=value#fragment",
    )
    assert response.status_code == 200
    assert response.json()["source"] == {
        "name": "Sveriges Radio",
        "url": "https://www.sverigesradio.se/",
        "apiName": "Sveriges Radios VMA-API",
        "apiVersion": "3",
        "apiDocumentationUrl": "https://vmaapi.sr.se/index.html",
        "apiUrl": "https://vmaapi.sr.se/testapi/v3/examples/data",
    }
    assert "private" not in response.text
    assert "fragment" not in response.text


def test_omits_credentials_from_public_api_address() -> None:
    """Does not expose configured URL credentials through response metadata."""
    response = _request_vmas(
        lambda _: httpx.Response(200, json={"timestamp": "2026-10-05T12:00:00Z", "alerts": []}),
        upstream_url="https://example-user:example-password@upstream.example/vmas",
    )
    assert response.status_code == 200
    assert response.json()["source"]["apiUrl"] == "https://upstream.example/vmas"
    assert "example-user" not in response.text
    assert "example-password" not in response.text


def test_default_upstream_is_sr_v3(monkeypatch: pytest.MonkeyPatch) -> None:
    """Uses the VMA source independently of future Krisinformation news integration."""
    monkeypatch.delenv("KRISKOMPASSEN_VMA_API_URL", raising=False)
    assert str(Settings().vma_api_url) == "https://vmaapi.sr.se/api/v3/alerts"
