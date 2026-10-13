"""Shares one short-lived VMA result per instance so SR calls do not grow with client count."""

import asyncio
import math
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import UTC, datetime

from src.core.config import VMA_CACHE_TTL_SECONDS
from src.core.errors import UpstreamError
from src.models.vma import VmaResponse


@dataclass(frozen=True)
class CachedVma:
    """Describes a feed served from the cache.

    checked_at is the wall-clock time of the last successful SR check. stale is true when the
    latest attempt failed and this older feed is returned instead; max_age_seconds is then 0.
    """

    data: VmaResponse
    checked_at: datetime
    stale: bool
    max_age_seconds: int


@dataclass(frozen=True)
class _Success:
    data: VmaResponse
    checked_at: datetime


def _utc_now() -> datetime:
    return datetime.now(UTC)


class VmaCache:
    """Fetches on demand at most once per TTL, counted from the latest attempt.

    Failed attempts also start a new period, so an SR outage does not cause one upstream call
    per incoming request. Concurrent callers wait on a lock and share the single attempt's
    result. There is no background refresh; nothing is fetched without a request. State is
    in memory only, per process, and is lost when a serverless instance starts cold.

    The monotonic clock measures age so wall-clock adjustments cannot extend or shorten the TTL;
    the wall clock only supplies checkedAt. Both are injectable for deterministic tests.
    """

    def __init__(
        self,
        ttl_seconds: float = VMA_CACHE_TTL_SECONDS,
        monotonic: Callable[[], float] = time.monotonic,
        wall_clock: Callable[[], datetime] = _utc_now,
    ) -> None:
        """Creates an empty cache; the lock binds to the event loop on first contention."""
        self._ttl_seconds = ttl_seconds
        self._monotonic = monotonic
        self._wall_clock = wall_clock
        self._lock = asyncio.Lock()
        self._attempted_at: float | None = None
        self._success: _Success | None = None
        self._error: UpstreamError | None = None

    async def get(self, fetch: Callable[[], Awaitable[VmaResponse]]) -> CachedVma:
        """Returns the cached feed, calling fetch only when the latest attempt has expired.

        Raises UpstreamError when the latest attempt failed and no successful feed exists.
        An empty successful feed is cached like any other result. A cancelled fetch records
        nothing, so the next caller attempts again.
        """
        if self._attempt_due():
            async with self._lock:
                # Callers that waited for the lock reuse the attempt that just completed.
                if self._attempt_due():
                    await self._attempt(fetch)
        return self._current()

    def _age_seconds(self) -> float | None:
        if self._attempted_at is None:
            return None
        return self._monotonic() - self._attempted_at

    def _attempt_due(self) -> bool:
        age = self._age_seconds()
        return age is None or not 0 <= age < self._ttl_seconds

    async def _attempt(self, fetch: Callable[[], Awaitable[VmaResponse]]) -> None:
        try:
            data = await fetch()
        except UpstreamError as error:
            self._error = error
        else:
            self._success = _Success(data=data, checked_at=self._wall_clock())
            self._error = None
        # Completion time starts the period, so attempts are always at least one TTL apart.
        self._attempted_at = self._monotonic()

    def _current(self) -> CachedVma:
        if self._success is None:
            if self._error is None:
                raise RuntimeError("The VMA cache has no completed attempt.")
            # A new instance avoids accumulating tracebacks on one shared exception object.
            raise UpstreamError(self._error.code, self._error.message, self._error.status_code)
        if self._error is not None:
            return CachedVma(self._success.data, self._success.checked_at, True, 0)
        age = self._age_seconds() or 0.0
        max_age = max(0, math.floor(self._ttl_seconds - age))
        return CachedVma(self._success.data, self._success.checked_at, False, max_age)
