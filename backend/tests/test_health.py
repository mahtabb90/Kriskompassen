"""Checks the health endpoint without contacting the public upstream API."""

import asyncio

import httpx

from src.app import create_app
from src.core.config import Settings


def test_health_reports_ok() -> None:
    """Reports availability from the application alone, without upstream access."""

    async def run_request() -> httpx.Response:
        application = create_app(Settings(cors_origins=[]))
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=application),
            base_url="http://backend.example",
        ) as client:
            return await client.get("/health")

    response = asyncio.run(run_request())

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
