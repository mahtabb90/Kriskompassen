"""Serves civil-defense shelters from a bundled local snapshot, not a live MCF call.

MVP decision: a single static, committed file (backend/src/data/shelters.json), refreshed
manually by running backend/scripts/fetch_shelters.py. No automatic daily refresh yet - that is
a separate, future ticket. If the file is missing or invalid, this raises ShelterDataError
rather than falling back to a live upstream call, mirroring how src/services/crisis.py treats
a broken crisis.json.
"""

import math
from pathlib import Path

from pydantic import TypeAdapter

from src.core.errors import ShelterDataError
from src.models.shelter import Shelter, ShelterBoundsResponse, ShelterListResponse, ShelterSource

SHELTERS_DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "shelters.json"
_SHELTERS = TypeAdapter(list[Shelter])

# Matches the frontend's NEAREST_SHELTER_COUNT (see frontend/src/utils/distance.ts).
NEAREST_COUNT = 5
EARTH_RADIUS_METERS = 6_371_000.0


def load_local_shelters(path: Path | None = None) -> list[Shelter]:
    """Returns every shelter in the bundled snapshot, validated and in file order.

    path defaults to the current SHELTERS_DATA_PATH, looked up by name rather than bound as a
    default parameter value, so monkeypatching the module attribute in tests (see test_crisis.py's
    CRISIS_DATA_PATH pattern) takes effect even though this module is imported once. Called from
    a synchronous FastAPI route so disk I/O runs in its thread pool, matching load_crisis_articles().
    Raises ShelterDataError for file, encoding, JSON or schema failures. Nothing is read at
    import time.
    """
    target = path if path is not None else SHELTERS_DATA_PATH
    try:
        return _SHELTERS.validate_json(target.read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        raise ShelterDataError(
            "shelters_data_unavailable", "Skyddsrumsdata kunde inte läsas.", 500
        ) from error


class LocalShelterStore:
    """Loads the bundled shelter snapshot once and reuses it in memory for every request.

    Unlike load_crisis_articles() - deliberately uncached, since crisis.json is tiny and its
    content is meant to reflect edits immediately - the shelter snapshot has 60,000+ records,
    so re-reading and re-validating it on every request would cost real time for no benefit: the
    file never changes while a process is running (MVP has no runtime updates). A failed load is
    never cached, so the next request retries rather than being stuck on a transient failure
    (e.g. a permissions issue fixed after this instance started) for the rest of this instance's
    life. State is in-memory only, per process, and is lost when a serverless instance starts
    cold - the next cold start simply reloads it, which is harmless since the file is static.
    """

    def __init__(self, path: Path | None = None) -> None:
        """path defaults to the current SHELTERS_DATA_PATH, resolved on first get_shelters()
        call rather than at construction time - see load_local_shelters()'s docstring.
        """
        self._path = path
        self._shelters: list[Shelter] | None = None

    def get_shelters(self) -> list[Shelter]:
        """Returns the cached snapshot, loading and validating it on the first call."""
        if self._shelters is None:
            self._shelters = load_local_shelters(self._path)
        return self._shelters


def _haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Returns the great-circle distance between two WGS84 points, in meters."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    return 2 * EARTH_RADIUS_METERS * math.asin(math.sqrt(a))


def nearest_shelters(
    shelters: list[Shelter], lat: float, lon: float, count: int = NEAREST_COUNT
) -> list[tuple[Shelter, float]]:
    """Returns the count closest shelters to (lat, lon), each paired with its distance in
    meters, nearest first. An input shorter than count returns everything available.
    """
    with_distance = [
        (shelter, _haversine_distance_meters(lat, lon, shelter.lat, shelter.lon))
        for shelter in shelters
    ]
    with_distance.sort(key=lambda pair: pair[1])
    return with_distance[:count]


def build_shelters_response(shelters: list[Shelter], lat: float, lon: float) -> ShelterListResponse:
    """Builds the nearest-shelters response for one position from the full local snapshot."""
    nearest = nearest_shelters(shelters, lat, lon)
    farthest_distance = max((distance for _, distance in nearest), default=0.0)
    return ShelterListResponse(
        shelters=[shelter for shelter, _ in nearest],
        source=ShelterSource(),
        bboxRadiusMetersUsed=round(farthest_distance),
    )


def shelters_within_bounds(
    shelters: list[Shelter], *, north: float, south: float, east: float, west: float
) -> list[Shelter]:
    """Returns every shelter whose (lat, lon) falls within the given rectangle, in file order.

    A naive per-axis range check. Does not special-case an antimeridian-crossing bbox
    (west > east) - unreachable in practice, since every shelter is in Sweden (lat ~55-69,
    lon ~11-24): a caller would have to pan nearly all the way around the globe to construct
    such a bbox. An inverted rectangle (north < south or east < west) simply matches nothing.
    """
    return [
        shelter
        for shelter in shelters
        if south <= shelter.lat <= north and west <= shelter.lon <= east
    ]


def build_shelters_bounds_response(
    shelters: list[Shelter], *, north: float, south: float, east: float, west: float
) -> ShelterBoundsResponse:
    """Builds the within-bounds response for one map viewport from the full local snapshot."""
    matches = shelters_within_bounds(shelters, north=north, south=south, east=east, west=west)
    return ShelterBoundsResponse(shelters=matches, source=ShelterSource())
