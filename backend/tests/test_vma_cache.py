"""Checks the shared VMA cache with injected clocks and a fake SR fetch, without sleeping."""

import asyncio
from datetime import UTC, datetime, timedelta

from src.core.config import VMA_CACHE_TTL_SECONDS
from src.core.errors import UpstreamError
from src.models.vma import VmaResponse, VmaSource
from src.services.vma_cache import CachedVma, VmaCache

START = datetime(2026, 10, 5, 12, 0, tzinfo=UTC)


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
