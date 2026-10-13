"""Checks the shared VMA cache with injected clocks and a fake SR fetch, without sleeping."""

import asyncio
from datetime import UTC, datetime, timedelta

import httpx
import pytest

from src.api.dependencies import get_http_client, get_vma_cache
from src.app import create_app
from src.core.config import VMA_CACHE_TTL_SECONDS, Settings
from src.core.errors import UpstreamError
from src.models.vma import VmaResponse, VmaSource
from src.services.vma_cache import CachedVma, VmaCache

START = datetime(2026, 10, 5, 12, 0, tzinfo=UTC)
CONCURRENT_REQUESTS = 10
# Enough event-loop turns for every in-memory request to reach the cache before release.
SCHEDULER_TURNS = 100


class FakeClocks:
    """Advances monotonic and wall time independently so each clock's role can be tested."""

    def __init__(self) -> None:
        """Starts both clocks at fixed, arbitrary values."""
        self.monotonic_seconds = 1_000.0
        self.wall = START

    def monotonic(self) -> float:
        """Returns the fake monotonic time in seconds."""
        return self.monotonic_seconds

    def wall_clock(self) -> datetime:
        """Returns the fake timezone-aware wall time."""
        return self.wall

    def advance(self, seconds: float) -> None:
        """Moves both clocks forward together, as real time does."""
        self.monotonic_seconds += seconds
        self.wall += timedelta(seconds=seconds)


class FakeSr:
    """Returns queued feeds or raises queued failures and counts every call."""

    def __init__(self, *outcomes: VmaResponse | UpstreamError) -> None:
        """Queues outcomes in call order."""
        self.calls = 0
        self.outcomes = list(outcomes)

    async def fetch(self) -> VmaResponse:
        """Simulates one SR call."""
        self.calls += 1
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, UpstreamError):
            raise outcome
        return outcome


def _feed(*alerts: str) -> VmaResponse:
    return VmaResponse(
        timestamp="2026-10-05T12:00:00Z",
        alerts=list(alerts),
        source=VmaSource(apiUrl="https://upstream.example/vmas"),
    )


def _cache(clocks: FakeClocks) -> VmaCache:
    return VmaCache(monotonic=clocks.monotonic, wall_clock=clocks.wall_clock)


def _get(cache: VmaCache, sr: FakeSr) -> CachedVma:
    return asyncio.run(cache.get(sr.fetch))


def test_ttl_is_sixty_seconds() -> None:
    """Keeps the team-decided period in the single central constant."""
    assert VMA_CACHE_TTL_SECONDS == 60


def test_first_request_fetches_a_fresh_result() -> None:
    """Calls SR for an empty cache and records the wall time of that successful check."""
    clocks = FakeClocks()
    cache = _cache(clocks)
    feed = _feed("first")
    sr = FakeSr(feed)

    result = _get(cache, sr)

    assert sr.calls == 1
    assert result.data == feed
    assert result.checked_at == START
    assert result.stale is False


def test_cache_hit_within_ttl_does_not_call_sr() -> None:
    """Serves every request inside the period from the single earlier SR check."""
    clocks = FakeClocks()
    cache = _cache(clocks)
    feed = _feed("first")
    sr = FakeSr(feed)
    _get(cache, sr)

    for _ in range(5):
        clocks.advance(11.9)
        result = _get(cache, sr)
        assert result.data == feed
        assert result.checked_at == START
        assert result.stale is False

    assert sr.calls == 1


def test_expired_cache_fetches_again() -> None:
    """Calls SR again once the period has elapsed and reports the new check time."""
    clocks = FakeClocks()
    cache = _cache(clocks)
    newer = _feed("second")
    sr = FakeSr(_feed("first"), newer)
    _get(cache, sr)

    clocks.advance(VMA_CACHE_TTL_SECONDS)
    result = _get(cache, sr)

    assert sr.calls == 2
    assert result.data == newer
    assert result.checked_at == START + timedelta(seconds=VMA_CACHE_TTL_SECONDS)
    assert result.stale is False


def test_empty_feed_is_cached_as_valid() -> None:
    """Treats a successful feed without alerts as a normal cached result."""
    clocks = FakeClocks()
    cache = _cache(clocks)
    sr = FakeSr(_feed())

    first = _get(cache, sr)
    clocks.advance(30)
    second = _get(cache, sr)

    assert sr.calls == 1
    assert first.data.alerts == []
    assert second.data.alerts == []
    assert second.stale is False
    assert second.checked_at == START


def test_no_sr_calls_without_requests() -> None:
    """Never contacts SR on its own; only an incoming request starts an attempt."""
    clocks = FakeClocks()
    cache = _cache(clocks)
    sr = FakeSr(_feed())

    clocks.advance(10 * VMA_CACHE_TTL_SECONDS)
    assert sr.calls == 0

    _get(cache, sr)
    clocks.advance(10 * VMA_CACHE_TTL_SECONDS)
    assert sr.calls == 1


def test_wall_clock_adjustments_do_not_affect_the_period() -> None:
    """Measures age with the monotonic clock; the wall clock only supplies checkedAt."""
    clocks = FakeClocks()
    cache = _cache(clocks)
    sr = FakeSr(_feed("first"), _feed("second"))
    _get(cache, sr)

    clocks.wall += timedelta(hours=2)
    clocks.monotonic_seconds += 10
    assert _get(cache, sr).checked_at == START
    clocks.wall -= timedelta(hours=4)
    assert _get(cache, sr).checked_at == START
    assert sr.calls == 1

    clocks.monotonic_seconds += VMA_CACHE_TTL_SECONDS
    assert _get(cache, sr).checked_at == START - timedelta(hours=2)
    assert sr.calls == 2


def test_monotonic_clock_running_backwards_expires_the_cache() -> None:
    """Treats a negative age as expired instead of extending the period indefinitely."""
    clocks = FakeClocks()
    cache = _cache(clocks)
    sr = FakeSr(_feed("first"), _feed("second"))
    _get(cache, sr)

    clocks.monotonic_seconds -= 1
    _get(cache, sr)

    assert sr.calls == 2


async def _let_waiters_queue() -> None:
    for _ in range(SCHEDULER_TURNS):
        await asyncio.sleep(0)


async def _request_concurrently(*, primed: bool) -> tuple[list[httpx.Response], int]:
    """Sends concurrent API requests while the SR call under test waits on an event.

    With primed, one unblocked request fills the cache first and the period then expires.
    Returns the responses and the total number of SR calls.
    """
    clocks = FakeClocks()
    cache = _cache(clocks)
    upstream_calls = 0
    blocked_call = 2 if primed else 1
    started = asyncio.Event()
    release = asyncio.Event()

    async def upstream(_request: httpx.Request) -> httpx.Response:
        nonlocal upstream_calls
        upstream_calls += 1
        call = upstream_calls
        if call == blocked_call:
            started.set()
            await release.wait()
        return httpx.Response(
            200, json={"timestamp": "2026-10-05T12:00:00Z", "alerts": [f"call-{call}"]}
        )

    application = create_app(
        Settings(vma_api_url="https://upstream.example/vmas", vma_timeout_seconds=5)
    )
    async with httpx.AsyncClient(transport=httpx.MockTransport(upstream)) as sr_client:

        async def provide_upstream() -> httpx.AsyncClient:
            return sr_client

        async def provide_cache() -> VmaCache:
            return cache

        application.dependency_overrides[get_http_client] = provide_upstream
        application.dependency_overrides[get_vma_cache] = provide_cache
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=application), base_url="http://backend.example"
        ) as client:
            async with asyncio.timeout(5):
                if primed:
                    await client.get("/api/v1/vmas")
                    clocks.advance(VMA_CACHE_TTL_SECONDS)
                requests = [
                    asyncio.create_task(client.get("/api/v1/vmas"))
                    for _ in range(CONCURRENT_REQUESTS)
                ]
                await started.wait()
                await _let_waiters_queue()
                # Every request is still waiting for the single in-flight SR call.
                assert not any(request.done() for request in requests)
                release.set()
                responses = await asyncio.gather(*requests)
    return responses, upstream_calls


def test_concurrent_requests_on_empty_cache_make_one_sr_call() -> None:
    """Shares one SR call among all requests arriving before the first result."""
    responses, upstream_calls = asyncio.run(_request_concurrently(primed=False))

    assert upstream_calls == 1
    assert {response.status_code for response in responses} == {200}
    assert {tuple(response.json()["data"]["alerts"]) for response in responses} == {("call-1",)}
    assert {response.json()["checkedAt"] for response in responses} == {"2026-10-05T12:00:00Z"}


def test_concurrent_requests_on_expired_cache_make_one_sr_call() -> None:
    """Refreshes an expired cache once and gives every waiting request the new feed."""
    responses, upstream_calls = asyncio.run(_request_concurrently(primed=True))

    assert upstream_calls == 2
    assert {response.status_code for response in responses} == {200}
    assert {tuple(response.json()["data"]["alerts"]) for response in responses} == {("call-2",)}
    assert {response.json()["checkedAt"] for response in responses} == {"2026-10-05T12:01:00Z"}


class BlockingSr:
    """Holds every SR call until released, then returns or raises the configured outcome."""

    def __init__(self, outcome: VmaResponse | UpstreamError) -> None:
        """Creates unset start and release events for the calls."""
        self.calls = 0
        self.outcome = outcome
        self.started = asyncio.Event()
        self.release = asyncio.Event()

    async def fetch(self) -> VmaResponse:
        """Simulates an SR call that completes only after release."""
        self.calls += 1
        self.started.set()
        await self.release.wait()
        if isinstance(self.outcome, UpstreamError):
            raise self.outcome
        return self.outcome


def test_concurrent_requests_share_a_failed_attempt() -> None:
    """Gives every waiting request the same failure instead of retrying SR for each one."""

    async def run() -> tuple[list[BaseException | CachedVma], int]:
        cache = _cache(FakeClocks())
        sr = BlockingSr(UpstreamError("upstream_timeout", "Tog för lång tid.", status_code=504))
        requests = [asyncio.create_task(cache.get(sr.fetch)) for _ in range(CONCURRENT_REQUESTS)]
        await sr.started.wait()
        await _let_waiters_queue()
        sr.release.set()
        return await asyncio.gather(*requests, return_exceptions=True), sr.calls

    results, calls = asyncio.run(run())

    assert calls == 1
    assert all(isinstance(result, UpstreamError) for result in results)
    assert {(result.code, result.status_code) for result in results} == {("upstream_timeout", 504)}


def test_cancelled_attempt_lets_a_waiting_request_try_again() -> None:
    """Records nothing for a cancelled SR call, so a waiting request makes its own attempt."""

    async def run() -> tuple[CachedVma, int]:
        cache = _cache(FakeClocks())
        sr = BlockingSr(_feed("after-cancel"))
        first = asyncio.create_task(cache.get(sr.fetch))
        await sr.started.wait()
        waiting = asyncio.create_task(cache.get(sr.fetch))
        await _let_waiters_queue()
        first.cancel()
        with pytest.raises(asyncio.CancelledError):
            await first
        sr.release.set()
        return await waiting, sr.calls

    result, calls = asyncio.run(run())

    assert calls == 2
    assert result.data.alerts == ["after-cancel"]
    assert result.stale is False
