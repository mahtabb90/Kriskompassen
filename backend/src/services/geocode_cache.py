"""Shares short-lived Nominatim results per instance and throttles upstream calls to ~1/s."""

import asyncio
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from src.core.errors import UpstreamError
from src.models.geocode import GeocodeResponse

_QUEUE_FULL_MESSAGE = (
    "Just nu är det för många samtidiga adressuppslag. Försök igen om en liten stund, "
    "eller ange adressen manuellt."
)


@dataclass(frozen=True)
class _Entry:
    response: GeocodeResponse
    cached_at: float


class NominatimThrottle:
    """Spaces out upstream calls so no more than one starts per configured interval.

    Shared across every distinct coordinate; a cache hit never reaches this throttle, only an
    actual upstream fetch does. Not safe for concurrent callers on its own — it relies on
    GeocodeCache holding a lock around every call to wait_turn, which serializes callers and
    makes the internal state update race-free without a lock of its own.
    """

    def __init__(
        self,
        min_interval_seconds: float,
        monotonic: Callable[[], float] = time.monotonic,
        sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
    ) -> None:
        """Creates a throttle that allows an immediate first call."""
        self._min_interval_seconds = min_interval_seconds
        self._monotonic = monotonic
        self._sleep = sleep
        self._next_allowed_at: float | None = None

    async def wait_turn(self) -> None:
        """Blocks the caller, if needed, until its turn to reach Nominatim.

        Each call reserves the next slot immediately, one interval after the previous
        reservation, so queued callers are spaced out even before any of them wakes up.
        """
        now = self._monotonic()
        start = now if self._next_allowed_at is None else max(now, self._next_allowed_at)
        self._next_allowed_at = start + self._min_interval_seconds
        if start > now:
            await self._sleep(start - now)


class GeocodeCache:
    """Serves repeated reverse-geocode lookups from memory and throttles the rest to Nominatim.

    Keyed by the exact (lat, lon) pair a caller supplies — not rounded or snapped — so only a
    genuine repeat of the same coordinate (e.g. a retry, or a re-render with an unchanged
    position) is served without contacting Nominatim.

    A single asyncio.Lock serializes every cache miss. An identical lookup already in flight is
    never fetched twice: a waiter re-checks the cache after acquiring the lock and reuses the
    result the earlier call just stored. Lookups for different coordinates queue behind the same
    lock and each pay the shared throttle's wait, so distinct concurrent lookups cannot reach
    Nominatim faster than the configured interval between them.

    A failed fetch (UpstreamError) is raised exactly as before and is never cached, so the next
    request for the same coordinate retries immediately rather than waiting out a TTL. Only a
    successful response — found: true or found: false — is cached. There is no stale fallback:
    an expired entry is treated as a miss and re-fetched. Expired entries are purged lazily on
    the next miss so memory does not grow from one-off coordinates.

    A cache miss that arrives once max_queue_depth misses are already waiting on or fetching
    through the lock is rejected immediately with UpstreamError("geocode_queue_full", ...,
    status_code=503) instead of joining the queue. This bounds the worst-case wait (roughly
    max_queue_depth * the throttle's interval) and gives an immediate, actionable failure during
    a surge of distinct positions — e.g. many users at once during a real crisis — rather than
    letting the queue, and the wait, grow without limit.

    State is in-memory only, per process, and is lost when a serverless instance starts cold.
    """

    def __init__(
        self,
        ttl_seconds: float,
        throttle: NominatimThrottle,
        max_queue_depth: int,
        monotonic: Callable[[], float] = time.monotonic,
    ) -> None:
        """Creates an empty cache bound to the given throttle."""
        self._ttl_seconds = ttl_seconds
        self._throttle = throttle
        self._max_queue_depth = max_queue_depth
        self._monotonic = monotonic
        self._lock = asyncio.Lock()
        self._entries: dict[tuple[float, float], _Entry] = {}
        self._pending = 0

    async def get_or_fetch(
        self,
        lat: float,
        lon: float,
        fetch: Callable[[], Awaitable[GeocodeResponse]],
    ) -> GeocodeResponse:
        """Returns a cached result for (lat, lon), else throttles and fetches a fresh one.

        Raises whatever fetch raises; a raised fetch is not cached. Raises
        UpstreamError("geocode_queue_full", ...) without calling fetch at all if the queue
        is already at max_queue_depth.
        """
        key = (lat, lon)
        cached = self._fresh(key)
        if cached is not None:
            return cached
        if self._pending >= self._max_queue_depth:
            raise UpstreamError("geocode_queue_full", _QUEUE_FULL_MESSAGE, status_code=503)
        # No `await` occurs between the check above and this increment, so no other call can
        # slip past the cap in between; the two together are effectively one atomic step.
        self._pending += 1
        try:
            async with self._lock:
                # A waiter that queued behind an identical in-flight lookup reuses its result.
                cached = self._fresh(key)
                if cached is not None:
                    return cached
                await self._throttle.wait_turn()
                response = await fetch()
                self._entries[key] = _Entry(response, self._monotonic())
                self._purge_expired()
                return response
        finally:
            self._pending -= 1

    def _fresh(self, key: tuple[float, float]) -> GeocodeResponse | None:
        entry = self._entries.get(key)
        if entry is None:
            return None
        age = self._monotonic() - entry.cached_at
        # A negative age (clock running backwards) is treated as expired, not extended.
        if not 0 <= age < self._ttl_seconds:
            return None
        return entry.response

    def _purge_expired(self) -> None:
        now = self._monotonic()
        expired = [
            key
            for key, entry in self._entries.items()
            if not 0 <= now - entry.cached_at < self._ttl_seconds
        ]
        for key in expired:
            del self._entries[key]
