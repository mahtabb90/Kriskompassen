"""Checks the geocode cache and Nominatim throttle with injected clocks, without sleeping."""

import asyncio

import httpx
import pytest

from src.api.dependencies import get_geocode_cache, get_http_client
from src.app import create_app
from src.core.config import Settings
from src.core.errors import UpstreamError
from src.models.geocode import GeocodeResponse, GeocodeSource
from src.services.geocode_cache import GeocodeCache, NominatimThrottle

CONCURRENT_REQUESTS = 10
# Enough event-loop turns for every in-memory request to reach the cache before release.
SCHEDULER_TURNS = 100

NOMINATIM_RESULT = {
    "place_id": 12345,
    "licence": "Data © OpenStreetMap contributors, ODbL 1.0",
    "osm_type": "way",
    "osm_id": 987654,
    "lat": "59.334591",
    "lon": "18.063240",
    "display_name": "Drottninggatan 1, 111 51 Stockholm, Sverige",
    "address": {"road": "Drottninggatan", "city": "Stockholm"},
    "boundingbox": ["59.3345", "59.3347", "18.0631", "18.0634"],
}


class FakeClock:
    """Advances a single monotonic clock so wait math can be tested without real sleeping."""

    def __init__(self, start: float = 1_000.0) -> None:
        """Starts the clock at a fixed, arbitrary value."""
        self.seconds = start

    def monotonic(self) -> float:
        """Returns the fake monotonic time in seconds."""
        return self.seconds

    def advance(self, seconds: float) -> None:
        """Moves the clock forward, as real time does."""
        self.seconds += seconds


async def _no_sleep(_seconds: float) -> None:
    """Resolves immediately; used where a test does not care about throttle timing."""


def _response(found: bool = True, lat: float = 59.0, lon: float = 18.0) -> GeocodeResponse:
    return GeocodeResponse(
        found=found,
        address="Exempelgatan 1, Exempelstad" if found else None,
        municipality="Exempelstad" if found else None,
        county="Exempellän" if found else None,
        lat=lat if found else None,
        lon=lon if found else None,
        message=None if found else "Ingen adress kunde hittas för den angivna positionen.",
        source=GeocodeSource(apiUrl="https://upstream.example/reverse"),
    )


class FakeNominatim:
    """Returns queued outcomes and counts every call, like a stand-in for fetch_geocode."""

    def __init__(self, *outcomes: GeocodeResponse | UpstreamError) -> None:
        """Queues outcomes in call order."""
        self.calls = 0
        self.outcomes = list(outcomes)

    async def fetch(self) -> GeocodeResponse:
        """Simulates one Nominatim call."""
        self.calls += 1
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, UpstreamError):
            raise outcome
        return outcome


def _cache(
    clock: FakeClock,
    ttl_seconds: float = 300.0,
    min_interval_seconds: float = 1.0,
    max_queue_depth: int = 100,
) -> GeocodeCache:
    throttle = NominatimThrottle(min_interval_seconds, monotonic=clock.monotonic, sleep=_no_sleep)
    return GeocodeCache(ttl_seconds, throttle, max_queue_depth, monotonic=clock.monotonic)


def test_first_lookup_fetches() -> None:
    """Calls Nominatim for an empty cache."""
    clock = FakeClock()
    cache = _cache(clock)
    nominatim = FakeNominatim(_response())

    result = asyncio.run(cache.get_or_fetch(59.0, 18.0, nominatim.fetch))

    assert nominatim.calls == 1
    assert result.found is True


def test_identical_lookup_within_ttl_is_served_from_cache() -> None:
    """Serves a repeat of the exact same coordinate from memory within the TTL."""
    clock = FakeClock()
    cache = _cache(clock)
    nominatim = FakeNominatim(_response())
    asyncio.run(cache.get_or_fetch(59.0, 18.0, nominatim.fetch))

    clock.advance(299)
    result = asyncio.run(cache.get_or_fetch(59.0, 18.0, nominatim.fetch))

    assert nominatim.calls == 1
    assert result.found is True


def test_not_found_result_is_cached_too() -> None:
    """Caches found: false the same way as a successful match."""
    clock = FakeClock()
    cache = _cache(clock)
    nominatim = FakeNominatim(_response(found=False))

    first = asyncio.run(cache.get_or_fetch(59.0, 18.0, nominatim.fetch))
    second = asyncio.run(cache.get_or_fetch(59.0, 18.0, nominatim.fetch))

    assert nominatim.calls == 1
    assert first.found is False
    assert second.found is False


def test_expired_entry_fetches_again() -> None:
    """Treats an entry older than the TTL as a miss rather than serving it as fresh."""
    clock = FakeClock()
    cache = _cache(clock, ttl_seconds=300.0)
    nominatim = FakeNominatim(_response(), _response())
    asyncio.run(cache.get_or_fetch(59.0, 18.0, nominatim.fetch))

    clock.advance(300)
    asyncio.run(cache.get_or_fetch(59.0, 18.0, nominatim.fetch))

    assert nominatim.calls == 2


def test_distinct_coordinates_are_cached_separately() -> None:
    """Never serves one coordinate's result for a different, distinct coordinate."""
    clock = FakeClock()
    cache = _cache(clock)
    nominatim = FakeNominatim(_response(lat=59.0, lon=18.0), _response(lat=60.0, lon=19.0))

    asyncio.run(cache.get_or_fetch(59.0, 18.0, nominatim.fetch))
    asyncio.run(cache.get_or_fetch(60.0, 19.0, nominatim.fetch))

    assert nominatim.calls == 2


def test_failed_fetch_is_not_cached_and_retries_immediately() -> None:
    """Propagates UpstreamError exactly as before and never caches the failed attempt."""
    clock = FakeClock()
    cache = _cache(clock)
    error = UpstreamError("upstream_timeout", "Tog för lång tid.", status_code=504)
    nominatim = FakeNominatim(error, _response())

    with pytest.raises(UpstreamError):
        asyncio.run(cache.get_or_fetch(59.0, 18.0, nominatim.fetch))

    result = asyncio.run(cache.get_or_fetch(59.0, 18.0, nominatim.fetch))

    assert nominatim.calls == 2
    assert result.found is True


def test_concurrent_identical_lookups_make_one_fetch() -> None:
    """Collapses concurrent lookups for the same coordinate into a single Nominatim call."""

    async def run() -> int:
        clock = FakeClock()
        cache = _cache(clock)
        started = asyncio.Event()
        release = asyncio.Event()
        calls = 0

        async def fetch() -> GeocodeResponse:
            nonlocal calls
            calls += 1
            started.set()
            await release.wait()
            return _response()

        tasks = [
            asyncio.create_task(cache.get_or_fetch(59.0, 18.0, fetch))
            for _ in range(CONCURRENT_REQUESTS)
        ]
        await started.wait()
        for _ in range(SCHEDULER_TURNS):
            await asyncio.sleep(0)
        assert not any(task.done() for task in tasks)
        release.set()
        results = await asyncio.gather(*tasks)
        assert all(result.found for result in results)
        return calls

    assert asyncio.run(run()) == 1


def test_throttle_allows_an_immediate_first_call() -> None:
    """Never delays the very first call to Nominatim."""
    clock = FakeClock()
    sleeps: list[float] = []

    async def record_sleep(seconds: float) -> None:
        sleeps.append(seconds)
        clock.advance(seconds)

    throttle = NominatimThrottle(1.0, monotonic=clock.monotonic, sleep=record_sleep)

    asyncio.run(throttle.wait_turn())

    assert sleeps == []


def test_throttle_spaces_sequential_calls_by_the_interval() -> None:
    """Delays each call so it starts no sooner than one interval after the previous one."""
    clock = FakeClock()
    sleeps: list[float] = []

    async def record_sleep(seconds: float) -> None:
        sleeps.append(seconds)
        clock.advance(seconds)

    throttle = NominatimThrottle(1.0, monotonic=clock.monotonic, sleep=record_sleep)

    async def run() -> None:
        await throttle.wait_turn()
        await throttle.wait_turn()
        await throttle.wait_turn()

    asyncio.run(run())

    assert sleeps == [1.0, 1.0]


def test_throttle_does_not_sleep_once_enough_time_has_passed() -> None:
    """Lets a call through immediately once the configured interval has already elapsed."""
    clock = FakeClock()
    sleeps: list[float] = []

    async def record_sleep(seconds: float) -> None:
        sleeps.append(seconds)

    throttle = NominatimThrottle(1.0, monotonic=clock.monotonic, sleep=record_sleep)

    async def run() -> None:
        await throttle.wait_turn()
        clock.advance(1.0)
        await throttle.wait_turn()

    asyncio.run(run())

    assert sleeps == []


def test_distinct_lookups_are_throttled_through_the_cache() -> None:
    """Paces distinct, back-to-back cache misses by the configured interval, not just hits."""
    clock = FakeClock()
    sleeps: list[float] = []

    async def record_sleep(seconds: float) -> None:
        sleeps.append(seconds)
        clock.advance(seconds)

    throttle = NominatimThrottle(1.0, monotonic=clock.monotonic, sleep=record_sleep)
    cache = GeocodeCache(300.0, throttle, 100, monotonic=clock.monotonic)
    nominatim = FakeNominatim(_response(lat=59.0, lon=18.0), _response(lat=60.0, lon=19.0))

    async def run() -> None:
        await cache.get_or_fetch(59.0, 18.0, nominatim.fetch)
        await cache.get_or_fetch(60.0, 19.0, nominatim.fetch)

    asyncio.run(run())

    assert nominatim.calls == 2
    assert sleeps == [1.0]


def test_queue_full_rejects_a_new_miss_without_calling_fetch() -> None:
    """Fails fast with geocode_queue_full once max_queue_depth misses are already pending."""

    async def run() -> UpstreamError:
        clock = FakeClock()
        cache = _cache(clock, max_queue_depth=1)
        started = asyncio.Event()
        release = asyncio.Event()
        second_fetch_calls = 0

        async def blocking_fetch() -> GeocodeResponse:
            started.set()
            await release.wait()
            return _response(lat=59.0, lon=18.0)

        async def second_fetch() -> GeocodeResponse:
            nonlocal second_fetch_calls
            second_fetch_calls += 1
            return _response(lat=60.0, lon=19.0)

        first = asyncio.create_task(cache.get_or_fetch(59.0, 18.0, blocking_fetch))
        await started.wait()

        with pytest.raises(UpstreamError) as raised:
            await cache.get_or_fetch(60.0, 19.0, second_fetch)

        release.set()
        await first
        assert second_fetch_calls == 0
        return raised.value

    error = asyncio.run(run())

    assert error.code == "geocode_queue_full"
    assert error.status_code == 503
    assert error.message


def test_queue_frees_up_once_the_blocking_lookup_completes() -> None:
    """Lets a new miss through again once a pending one finishes and the queue has room."""

    async def run() -> GeocodeResponse:
        clock = FakeClock()
        cache = _cache(clock, max_queue_depth=1)
        nominatim = FakeNominatim(_response(lat=59.0, lon=18.0), _response(lat=60.0, lon=19.0))

        await cache.get_or_fetch(59.0, 18.0, nominatim.fetch)
        return await cache.get_or_fetch(60.0, 19.0, nominatim.fetch)

    result = asyncio.run(run())

    assert result.found is True


def test_queue_cap_does_not_reject_a_cache_hit() -> None:
    """Never rejects an identical repeat lookup, even with the queue already at its cap."""

    async def run() -> GeocodeResponse:
        clock = FakeClock()
        cache = _cache(clock, max_queue_depth=1)
        nominatim = FakeNominatim(_response())
        started = asyncio.Event()
        release = asyncio.Event()

        async def blocking_fetch() -> GeocodeResponse:
            started.set()
            await release.wait()
            return _response()

        # Prime the cache for (59.0, 18.0) first, then occupy the one queue slot with a
        # different, still-pending coordinate.
        await cache.get_or_fetch(59.0, 18.0, nominatim.fetch)
        other = asyncio.create_task(cache.get_or_fetch(60.0, 19.0, blocking_fetch))
        await started.wait()

        result = await cache.get_or_fetch(59.0, 18.0, nominatim.fetch)
        release.set()
        await other
        return result

    result = asyncio.run(run())

    assert result.found is True


def test_api_returns_503_when_the_geocode_queue_is_full() -> None:
    """Surfaces the queue-full rejection through the real app with the documented envelope."""

    async def run() -> httpx.Response:
        clock = FakeClock()
        throttle = NominatimThrottle(1.0, monotonic=clock.monotonic, sleep=_no_sleep)
        cache = GeocodeCache(300.0, throttle, 0, monotonic=clock.monotonic)
        settings = Settings(cors_origins=[])
        application = create_app(settings)

        async def provide_cache() -> GeocodeCache:
            return cache

        # The queue-full rejection happens before any upstream call, but FastAPI still
        # resolves every declared dependency, including the HTTP client, so it needs a value.
        async def fail_if_called(_request: httpx.Request) -> httpx.Response:
            raise AssertionError("The queue-full rejection must not reach the HTTP client.")

        application.dependency_overrides[get_geocode_cache] = provide_cache
        async with httpx.AsyncClient(transport=httpx.MockTransport(fail_if_called)) as unused:

            async def provide_upstream() -> httpx.AsyncClient:
                return unused

            application.dependency_overrides[get_http_client] = provide_upstream
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=application),
                base_url="http://backend.example",
            ) as client:
                return await client.get(
                    "/api/v1/geocode", params={"lat": 59.334591, "lon": 18.06324}
                )

    response = asyncio.run(run())

    assert response.status_code == 503
    assert response.headers["Cache-Control"] == "no-store"
    assert response.json()["error"]["code"] == "geocode_queue_full"
    assert isinstance(response.json()["error"]["message"], str)
    assert response.json()["error"]["message"]


def test_repeated_identical_request_through_the_api_is_served_from_cache() -> None:
    """Hits the mocked upstream once for two identical requests through the real app and cache."""
    calls = 0

    def upstream(_request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(200, json=NOMINATIM_RESULT)

    async def run_requests() -> list[httpx.Response]:
        settings = Settings(cors_origins=[])
        application = create_app(settings)
        async with httpx.AsyncClient(transport=httpx.MockTransport(upstream)) as upstream_client:

            async def provide_upstream() -> httpx.AsyncClient:
                return upstream_client

            application.dependency_overrides[get_http_client] = provide_upstream
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=application),
                base_url="http://backend.example",
            ) as client:
                params = {"lat": 59.334591, "lon": 18.06324}
                first = await client.get("/api/v1/geocode", params=params)
                second = await client.get("/api/v1/geocode", params=params)
                return [first, second]

    responses = asyncio.run(run_requests())

    assert calls == 1
    assert [response.status_code for response in responses] == [200, 200]
    assert responses[0].json() == responses[1].json()
    assert all(response.headers["Cache-Control"] == "no-store" for response in responses)
