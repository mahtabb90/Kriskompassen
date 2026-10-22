"""Checks the shelter-area cache with an injected clock, without sleeping or real HTTP."""

import asyncio

import pytest

from src.core.errors import UpstreamError
from src.models.shelter import ShelterListResponse, ShelterSource
from src.services.shelters_cache import GRID_CELL_DEGREES, ShelterAreaCache


class FakeClock:
    """Advances a single monotonic clock so TTL math can be tested without real sleeping."""

    def __init__(self, start: float = 1_000.0) -> None:
        """Starts the clock at a fixed, arbitrary value."""
        self.seconds = start

    def monotonic(self) -> float:
        """Returns the fake monotonic time in seconds."""
        return self.seconds

    def advance(self, seconds: float) -> None:
        """Moves the clock forward, as real time does."""
        self.seconds += seconds


def _response(radius: int = 2_000) -> ShelterListResponse:
    return ShelterListResponse(
        shelters=[],
        source=ShelterSource(apiUrl="https://upstream.example/wfs"),
        bboxRadiusMetersUsed=radius,
    )


class FakeMcf:
    """Returns queued outcomes and counts every call, like a stand-in for fetch_shelters_response."""

    def __init__(self, *outcomes: ShelterListResponse | UpstreamError) -> None:
        """Queues outcomes in call order."""
        self.calls = 0
        self.outcomes = list(outcomes)

    async def fetch(self) -> ShelterListResponse:
        """Simulates one upstream fetch."""
        self.calls += 1
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, UpstreamError):
            raise outcome
        return outcome


def _cache(clock: FakeClock, ttl_seconds: float = 600.0) -> ShelterAreaCache:
    return ShelterAreaCache(ttl_seconds, monotonic=clock.monotonic)


def test_first_lookup_fetches() -> None:
    """Fetches for an empty cache."""
    clock = FakeClock()
    cache = _cache(clock)
    mcf = FakeMcf(_response())

    result = asyncio.run(cache.get_or_fetch(59.0, 18.0, mcf.fetch))

    assert mcf.calls == 1
    assert result.bboxRadiusMetersUsed == 2_000


def test_identical_lookup_within_ttl_is_served_from_cache() -> None:
    """Serves a repeat of the exact same coordinate from memory within the TTL."""
    clock = FakeClock()
    cache = _cache(clock)
    mcf = FakeMcf(_response())
    asyncio.run(cache.get_or_fetch(59.0, 18.0, mcf.fetch))

    clock.advance(599)
    result = asyncio.run(cache.get_or_fetch(59.0, 18.0, mcf.fetch))

    assert mcf.calls == 1
    assert result.bboxRadiusMetersUsed == 2_000


def test_nearby_coordinate_in_the_same_grid_cell_is_served_from_cache() -> None:
    """Serves a nearby position from memory when it rounds to the same grid cell."""
    clock = FakeClock()
    cache = _cache(clock)
    mcf = FakeMcf(_response())
    asyncio.run(cache.get_or_fetch(59.000, 18.000, mcf.fetch))

    nearby_offset = GRID_CELL_DEGREES / 4
    asyncio.run(cache.get_or_fetch(59.000 + nearby_offset, 18.000 + nearby_offset, mcf.fetch))

    assert mcf.calls == 1


def test_expired_entry_fetches_again() -> None:
    """Treats an entry older than the TTL as a miss rather than serving it as fresh."""
    clock = FakeClock()
    cache = _cache(clock, ttl_seconds=600.0)
    mcf = FakeMcf(_response(), _response())
    asyncio.run(cache.get_or_fetch(59.0, 18.0, mcf.fetch))

    clock.advance(600)
    asyncio.run(cache.get_or_fetch(59.0, 18.0, mcf.fetch))

    assert mcf.calls == 2


def test_distinct_grid_cells_are_cached_separately() -> None:
    """Never serves one cell's result for a different, distant cell."""
    clock = FakeClock()
    cache = _cache(clock)
    mcf = FakeMcf(_response(radius=2_000), _response(radius=4_000))

    asyncio.run(cache.get_or_fetch(59.0, 18.0, mcf.fetch))
    asyncio.run(cache.get_or_fetch(60.0, 19.0, mcf.fetch))

    assert mcf.calls == 2


def test_failed_fetch_is_not_cached_and_retries_immediately() -> None:
    """Propagates UpstreamError exactly as raised and never caches the failed attempt."""
    clock = FakeClock()
    cache = _cache(clock)
    error = UpstreamError("upstream_timeout", "Tog för lång tid.", status_code=504)
    mcf = FakeMcf(error, _response())

    with pytest.raises(UpstreamError):
        asyncio.run(cache.get_or_fetch(59.0, 18.0, mcf.fetch))

    result = asyncio.run(cache.get_or_fetch(59.0, 18.0, mcf.fetch))

    assert mcf.calls == 2
    assert result.bboxRadiusMetersUsed == 2_000


def test_concurrent_identical_lookups_make_one_fetch() -> None:
    """Collapses concurrent lookups for the same cell into a single upstream call."""

    async def run() -> int:
        clock = FakeClock()
        cache = _cache(clock)
        started = asyncio.Event()
        release = asyncio.Event()
        calls = 0

        async def fetch() -> ShelterListResponse:
            nonlocal calls
            calls += 1
            started.set()
            await release.wait()
            return _response()

        tasks = [asyncio.create_task(cache.get_or_fetch(59.0, 18.0, fetch)) for _ in range(10)]
        await started.wait()
        for _ in range(100):
            await asyncio.sleep(0)
        assert not any(task.done() for task in tasks)
        release.set()
        results = await asyncio.gather(*tasks)
        assert all(result.bboxRadiusMetersUsed == 2_000 for result in results)
        return calls

    assert asyncio.run(run()) == 1


def test_concurrent_lookups_for_different_cells_do_not_block_each_other() -> None:
    """Lets an unrelated cell's lookup proceed while another cell's fetch is still in flight.

    Unlike GeocodeCache, there is no shared throttle to serialize distinct lookups through, so
    two different cells must not queue behind one global lock.
    """

    async def run() -> None:
        clock = FakeClock()
        cache = _cache(clock)
        blocked_started = asyncio.Event()
        release_blocked = asyncio.Event()

        async def blocking_fetch() -> ShelterListResponse:
            blocked_started.set()
            await release_blocked.wait()
            return _response(radius=2_000)

        async def other_fetch() -> ShelterListResponse:
            return _response(radius=4_000)

        blocked_task = asyncio.create_task(cache.get_or_fetch(59.0, 18.0, blocking_fetch))
        await blocked_started.wait()

        # A distant, unrelated cell must resolve without waiting for the blocked one.
        other_result = await asyncio.wait_for(
            cache.get_or_fetch(10.0, 100.0, other_fetch), timeout=1.0
        )
        assert other_result.bboxRadiusMetersUsed == 4_000

        release_blocked.set()
        await blocked_task

    asyncio.run(run())
