"""Checks browser access across separate frontend and backend deployment origins."""

import asyncio
import json

import httpx
import pytest

from src.api.dependencies import get_http_client
from src.app import create_app
from src.core.config import Settings

FRONTEND_ORIGINS = ["https://frontend.example", "https://preview.frontend.example"]


@pytest.fixture
def deployment_settings(monkeypatch: pytest.MonkeyPatch) -> Settings:
    """Uses the same JSON environment setting an operator supplies in Vercel."""
    monkeypatch.setenv("KRISKOMPASSEN_CORS_ORIGINS", json.dumps(FRONTEND_ORIGINS))
    return Settings(vma_api_url="https://upstream.example/vmas", vma_timeout_seconds=1)


def _request_from_origin(
    settings: Settings,
    origin: str,
    *,
    upstream_status: int = 200,
    preflight_method: str | None = None,
) -> httpx.Response:
    async def run_request() -> httpx.Response:
        upstream_requests = []

        def upstream_response(request: httpx.Request) -> httpx.Response:
            upstream_requests.append(request)
            if upstream_status == 504:
                raise httpx.ReadTimeout("Synthetic upstream timeout", request=request)
            return httpx.Response(
                upstream_status,
                json={"timestamp": "2026-10-07T08:00:00Z", "alerts": []},
            )

        application = create_app(settings)
        async with httpx.AsyncClient(transport=httpx.MockTransport(upstream_response)) as upstream:

            async def provide_upstream() -> httpx.AsyncClient:
                return upstream

            application.dependency_overrides[get_http_client] = provide_upstream
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=application),
                base_url="https://backend.example",
            ) as client:
                headers = {"Origin": origin, "Accept": "application/json"}
                if preflight_method is not None:
                    headers.update(
                        {
                            "Access-Control-Request-Method": preflight_method,
                            "Access-Control-Request-Headers": "accept",
                        }
                    )
                response = await client.request(
                    "OPTIONS" if preflight_method is not None else "GET",
                    "/api/v1/vmas",
                    headers=headers,
                )
                if preflight_method is not None:
                    assert upstream_requests == []
                return response

    return asyncio.run(run_request())


@pytest.mark.parametrize("origin", FRONTEND_ORIGINS)
@pytest.mark.parametrize(
    ("upstream_status", "expected_status", "error_code"),
    [(200, 200, None), (503, 502, "upstream_http_error"), (504, 504, "upstream_timeout")],
)
def test_allowed_origins_can_read_success_and_failures(
    deployment_settings: Settings,
    origin: str,
    upstream_status: int,
    expected_status: int,
    error_code: str | None,
) -> None:
    """Preserves readable failures instead of hiding them behind missing CORS headers."""
    response = _request_from_origin(deployment_settings, origin, upstream_status=upstream_status)

    assert response.status_code == expected_status
    assert response.headers["Access-Control-Allow-Origin"] == origin
    assert "origin" in response.headers["Vary"].lower()
    assert "Access-Control-Allow-Credentials" not in response.headers
    assert response.headers["Cache-Control"] == "no-store"
    if error_code is None:
        assert response.json()["alerts"] == []
        assert response.json()["source"]["name"] == "Sveriges Radio"
    else:
        assert response.json()["error"]["code"] == error_code
        assert "alerts" not in response.json()


def test_unlisted_origin_cannot_read_the_response(deployment_settings: Settings) -> None:
    """Requires the exact frontend origin; CORS does not authenticate server-to-server calls."""
    response = _request_from_origin(deployment_settings, "https://unlisted.frontend.example")

    assert response.status_code == 200
    assert "Access-Control-Allow-Origin" not in response.headers


@pytest.mark.parametrize("origin", FRONTEND_ORIGINS)
def test_allows_get_preflight_without_credentials(
    deployment_settings: Settings, origin: str
) -> None:
    """Allows a browser to request the public feed with its Accept header."""
    response = _request_from_origin(deployment_settings, origin, preflight_method="GET")

    assert response.status_code == 200
    assert response.headers["Access-Control-Allow-Origin"] == origin
    assert response.headers["Access-Control-Allow-Methods"] == "GET"
    assert "accept" in response.headers["Access-Control-Allow-Headers"].lower()
    assert "Access-Control-Allow-Credentials" not in response.headers


@pytest.mark.parametrize(
    ("origin", "method"),
    [("https://unlisted.frontend.example", "GET"), (FRONTEND_ORIGINS[0], "POST")],
)
def test_rejects_unapproved_preflight(
    deployment_settings: Settings, origin: str, method: str
) -> None:
    """Rejects unsupported browser origins or methods without fetching the upstream feed."""
    response = _request_from_origin(deployment_settings, origin, preflight_method=method)

    assert response.status_code == 400
