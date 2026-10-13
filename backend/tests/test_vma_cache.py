"""Checks the shared VMA cache with injected clocks and a fake SR fetch, without sleeping."""

import asyncio
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta

import httpx
import pytest

from src.api.dependencies import get_http_client, get_vma_cache
from src.app import create_app
from src.core.config import VMA_CACHE_TTL_SECONDS, Settings
from src.core.errors import UpstreamError, UpstreamErrorCode
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


UpstreamHandler = Callable[[httpx.Request], Awaitable[httpx.Response]]


@asynccontextmanager
async def _api(cache: VmaCache, upstream: UpstreamHandler) -> AsyncIterator[httpx.AsyncClient]:
    """Serves the real API with the given cache and a mocked SR transport."""
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
            yield client


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

    async with _api(cache, upstream) as client:
        async with asyncio.timeout(5):
            if primed:
                await client.get("/api/v1/vmas")
                clocks.advance(VMA_CACHE_TTL_SECONDS)
            requests = [
                asyncio.create_task(client.get("/api/v1/vmas")) for _ in range(CONCURRENT_REQUESTS)
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


@pytest.mark.parametrize(
    "error",
    [
        UpstreamError("upstream_network_error", "Kunde inte ansluta."),
        UpstreamError("upstream_http_error", "Källan svarade med ett fel."),
        UpstreamError("upstream_invalid_response", "Ogiltigt svar."),
        UpstreamError("upstream_timeout", "Tog för lång tid.", status_code=504),
    ],
    ids=lambda error: error.code,
)
def test_sr_failure_with_cached_feed_returns_stale_feed(error: UpstreamError) -> None:
    """Returns the last successful feed with its original check time instead of the failure."""
    clocks = FakeClocks()
    cache = _cache(clocks)
    feed = _feed("cached")
    sr = FakeSr(feed, error)
    _get(cache, sr)

    clocks.advance(VMA_CACHE_TTL_SECONDS)
    result = _get(cache, sr)

    assert sr.calls == 2
    assert result.data == feed
    assert result.checked_at == START
    assert result.stale is True
    assert result.max_age_seconds == 0


def test_failed_attempt_is_not_retried_within_the_period() -> None:
    """Counts the period from the failed attempt, so an outage costs one SR call per TTL."""
    clocks = FakeClocks()
    cache = _cache(clocks)
    sr = FakeSr(_feed("cached"), UpstreamError("upstream_http_error", "Fel."))
    _get(cache, sr)
    clocks.advance(VMA_CACHE_TTL_SECONDS)
    _get(cache, sr)

    for _ in range(5):
        clocks.advance(11.9)
        result = _get(cache, sr)
        assert result.stale is True
        assert result.checked_at == START

    assert sr.calls == 2


@pytest.mark.parametrize(
    ("code", "status"),
    [("upstream_network_error", 502), ("upstream_timeout", 504)],
)
def test_sr_failure_without_cached_feed_raises_until_the_next_attempt(
    code: UpstreamErrorCode, status: int
) -> None:
    """Raises the documented error, without retrying SR until the period has elapsed."""
    clocks = FakeClocks()
    cache = _cache(clocks)
    error = UpstreamError(code, "Fel.", status_code=status)
    sr = FakeSr(error, _feed("recovered"))

    for _ in range(2):
        with pytest.raises(UpstreamError) as raised:
            _get(cache, sr)
        assert (raised.value.code, raised.value.status_code) == (code, status)
        clocks.advance(VMA_CACHE_TTL_SECONDS - 1)
    assert sr.calls == 1

    clocks.advance(1)
    result = _get(cache, sr)
    assert sr.calls == 2
    assert result.data.alerts == ["recovered"]
    assert result.stale is False


def _scripted_sr(*outcomes: httpx.Response | Exception) -> tuple[UpstreamHandler, list[int]]:
    """Returns an SR transport handler that plays outcomes in order and a call counter."""
    queue = list(outcomes)
    calls = [0]

    async def upstream(_request: httpx.Request) -> httpx.Response:
        calls[0] += 1
        outcome = queue.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    return upstream, calls


def _sr_feed(*alerts: str) -> httpx.Response:
    return httpx.Response(200, json={"timestamp": "2026-10-05T12:00:00Z", "alerts": list(alerts)})


def test_api_returns_stale_feed_with_no_store_when_sr_fails() -> None:
    """Keeps serving the cached feed with stale: true when SR fails or sends an invalid feed."""

    async def run() -> list[httpx.Response]:
        clocks = FakeClocks()
        upstream, calls = _scripted_sr(
            _sr_feed("cached"),
            httpx.Response(503, text="unavailable"),
            httpx.Response(200, json={"alerts": "invalid"}),
        )
        async with _api(_cache(clocks), upstream) as client:
            responses = [await client.get("/api/v1/vmas")]
            for _ in range(2):
                clocks.advance(VMA_CACHE_TTL_SECONDS)
                responses.append(await client.get("/api/v1/vmas"))
        assert calls == [3]
        return responses

    fresh, *stale_responses = asyncio.run(run())

    assert fresh.json()["stale"] is False
    for response in stale_responses:
        assert response.status_code == 200
        assert response.headers["Cache-Control"] == "no-store"
        assert response.json() == {**fresh.json(), "stale": True}
        assert response.json()["checkedAt"] == "2026-10-05T12:00:00Z"


def test_api_returns_error_without_cached_feed() -> None:
    """Returns the documented error envelope, never an empty successful feed."""

    async def run() -> list[httpx.Response]:
        clocks = FakeClocks()
        request = httpx.Request("GET", "https://upstream.example/vmas")
        upstream, calls = _scripted_sr(httpx.ConnectError("Connection failed", request=request))
        async with _api(_cache(clocks), upstream) as client:
            first = await client.get("/api/v1/vmas")
            clocks.advance(VMA_CACHE_TTL_SECONDS - 1)
            second = await client.get("/api/v1/vmas")
        assert calls == [1]
        return [first, second]

    for response in asyncio.run(run()):
        assert response.status_code == 502
        assert response.headers["Cache-Control"] == "no-store"
        assert response.json()["error"]["code"] == "upstream_network_error"
        assert "data" not in response.json()


def test_api_recovers_after_sr_failure() -> None:
    """Returns to fresh data, a new checkedAt and max-age once SR succeeds after the period."""

    async def run() -> list[httpx.Response]:
        clocks = FakeClocks()
        upstream, calls = _scripted_sr(_sr_feed("before"), httpx.Response(503), _sr_feed("after"))
        async with _api(_cache(clocks), upstream) as client:
            responses = [await client.get("/api/v1/vmas")]
            clocks.advance(VMA_CACHE_TTL_SECONDS)
            responses.append(await client.get("/api/v1/vmas"))
            clocks.advance(VMA_CACHE_TTL_SECONDS)
            responses.append(await client.get("/api/v1/vmas"))
        assert calls == [3]
        return responses

    fresh, stale, recovered = asyncio.run(run())

    assert fresh.headers["Cache-Control"] == f"max-age={VMA_CACHE_TTL_SECONDS}"
    assert stale.headers["Cache-Control"] == "no-store"
    assert stale.json()["stale"] is True
    assert stale.json()["checkedAt"] == "2026-10-05T12:00:00Z"
    assert recovered.headers["Cache-Control"] == f"max-age={VMA_CACHE_TTL_SECONDS}"
    assert recovered.json()["stale"] is False
    assert recovered.json()["checkedAt"] == "2026-10-05T12:02:00Z"
    assert recovered.json()["data"]["alerts"] == ["after"]


@pytest.mark.parametrize(
    ("age", "max_age"),
    [(0, 60), (0.1, 59), (1, 59), (30, 30), (30.9, 29), (59, 1), (59.99, 0)],
)
def test_max_age_is_remaining_period_rounded_down(age: float, max_age: int) -> None:
    """Never lets a browser reuse a response beyond the cache period."""
    clocks = FakeClocks()
    cache = _cache(clocks)
    sr = FakeSr(_feed())
    _get(cache, sr)

    clocks.advance(age)
    result = _get(cache, sr)

    assert sr.calls == 1
    assert result.max_age_seconds == max_age


def test_api_max_age_decreases_between_requests() -> None:
    """Sends max-age for the remaining period, rounded down, and refreshes once it has elapsed."""

    async def run() -> list[httpx.Response]:
        clocks = FakeClocks()
        upstream, calls = _scripted_sr(_sr_feed(), _sr_feed())
        async with _api(_cache(clocks), upstream) as client:
            responses = []
            # Binary fractions keep the cumulative age exact: 0, 0.5, 15, 45, 59.75 and 60.
            for step in [0, 0.5, 14.5, 30, 14.75, 0.25]:
                clocks.advance(step)
                responses.append(await client.get("/api/v1/vmas"))
        assert calls == [2]
        return responses

    responses = asyncio.run(run())

    assert [response.headers["Cache-Control"] for response in responses] == [
        "max-age=60",
        "max-age=59",
        "max-age=45",
        "max-age=15",
        "max-age=0",
        "max-age=60",
    ]
    assert {response.json()["checkedAt"] for response in responses[:-1]} == {"2026-10-05T12:00:00Z"}
    assert responses[-1].json()["checkedAt"] == "2026-10-05T12:01:00Z"


def test_api_never_sends_s_maxage() -> None:
    """Keeps fresh, stale and error responses out of a shared CDN cache layer."""

    async def run() -> list[httpx.Response]:
        clocks = FakeClocks()
        upstream, _calls = _scripted_sr(httpx.Response(503), _sr_feed(), httpx.Response(503))
        async with _api(_cache(clocks), upstream) as client:
            responses = []
            for _ in range(3):
                responses.append(await client.get("/api/v1/vmas"))
                clocks.advance(VMA_CACHE_TTL_SECONDS)
        return responses

    error, fresh, stale = asyncio.run(run())

    assert (error.status_code, fresh.json()["stale"], stale.json()["stale"]) == (502, False, True)
    assert [response.headers["Cache-Control"] for response in (error, fresh, stale)] == [
        "no-store",
        "max-age=60",
        "no-store",
    ]
    for response in (error, fresh, stale):
        assert "s-maxage" not in response.headers["Cache-Control"]
        assert "CDN-Cache-Control" not in response.headers
        assert "Vercel-CDN-Cache-Control" not in response.headers
