"""Shares short-lived MCF shelter results per instance across requests in the same area."""

import asyncio
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from src.models.shelter import ShelterListResponse

# ~2 km, matching the smallest BBOX search radius in shelters.py - two requests inside the same
# cell are near enough that re-fetching separately would not change the result.
GRID_CELL_DEGREES = 0.02


@dataclass(frozen=True)
class _Entry:
    response: ShelterListResponse
    cached_at: float


def _grid_key(lat: float, lon: float) -> tuple[float, float]:
    """Rounds a coordinate to its enclosing grid cell so nearby requests share a cache hit."""
    return (
        round(lat / GRID_CELL_DEGREES) * GRID_CELL_DEGREES,
        round(lon / GRID_CELL_DEGREES) * GRID_CELL_DEGREES,
    )


class ShelterAreaCache:
    """Serves repeated nearby shelter lookups from memory instead of re-querying MCF's WFS.

    Keyed by a coarse grid cell rather than the exact coordinate - two nearby positions
    searching the same neighbourhood reuse one fetch. Unlike GeocodeCache, no throttle guards
    the upstream call: MCF publishes no rate limit for its WFS. A per-cell lock still collapses
    concurrent misses for the *same* cell into one fetch, but - unlike GeocodeCache's single
    shared lock - lookups for different cells never wait on each other, since there is no shared
    throttle state to serialize them through; serializing unrelated areas nationwide behind one
    lock would needlessly slow down simultaneous users in different cities during a real crisis.
    A failed fetch (UpstreamError) is never cached, so the next request for the same cell
    retries immediately rather than waiting out a TTL. State is in-memory only, per process, and
    is lost when a serverless instance starts cold.
    """

    def __init__(
        self,
        ttl_seconds: float,
        monotonic: Callable[[], float] = time.monotonic,
    ) -> None:
        """Creates an empty cache with the given time-to-live for each entry."""
        self._ttl_seconds = ttl_seconds
        self._monotonic = monotonic
        self._entries: dict[tuple[float, float], _Entry] = {}
        self._locks: dict[tuple[float, float], asyncio.Lock] = {}
        self._locks_guard = asyncio.Lock()

    async def get_or_fetch(
        self,
        lat: float,
        lon: float,
        fetch: Callable[[], Awaitable[ShelterListResponse]],
    ) -> ShelterListResponse:
        """Returns a cached result for (lat, lon)'s grid cell, else fetches and caches a fresh one.

        Raises whatever fetch raises; a raised fetch is not cached.
        """
        key = _grid_key(lat, lon)
        cached = self._fresh(key)
        if cached is not None:
            return cached
        lock = await self._lock_for(key)
        try:
            async with lock:
                # A waiter that queued behind an identical in-flight lookup reuses its result.
                cached = self._fresh(key)
                if cached is not None:
                    return cached
                response = await fetch()
                self._entries[key] = _Entry(response, self._monotonic())
                self._purge_expired()
                return response
        finally:
            await self._release_lock(key, lock)

    async def _lock_for(self, key: tuple[float, float]) -> asyncio.Lock:
        async with self._locks_guard:
            lock = self._locks.get(key)
            if lock is None:
                lock = asyncio.Lock()
                self._locks[key] = lock
            return lock

    async def _release_lock(self, key: tuple[float, float], lock: asyncio.Lock) -> None:
        """Drops a cell's lock once it is free, so the registry does not grow without bound.

        A concurrent waiter that already holds this same lock object keeps working correctly
        even after it is removed from the registry here; the next distinct lookup for this cell
        simply allocates a new lock instead of finding this one.
        """
        async with self._locks_guard:
            if not lock.locked() and self._locks.get(key) is lock:
                del self._locks[key]

    def _fresh(self, key: tuple[float, float]) -> ShelterListResponse | None:
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
