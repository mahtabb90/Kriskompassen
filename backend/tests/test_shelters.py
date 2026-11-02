"""Checks the bundled local shelter snapshot and its public API without external requests."""

import asyncio
import json
from pathlib import Path

import httpx
import pytest

from src.app import create_app
from src.core.config import Settings
from src.services import shelters


def _shelter(
    shelter_id: str,
    lat: float = 59.0,
    lon: float = 18.0,
    *,
    number: str | None = "120599-3",
    address: str | None = "Exempelgatan 1",
    capacity: int | None = 20,
    shelter_type: str | None = "Skyddsrum",
) -> dict:
    return {
        "id": shelter_id,
        "number": number,
        "address": address,
        "lat": lat,
        "lon": lon,
        "capacity": capacity,
        "type": shelter_type,
    }


@pytest.fixture
def shelters_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Replaces only the data-file boundary; routing and validation remain real."""
    path = tmp_path / "shelters.json"
    path.write_text(json.dumps([_shelter("1")]), encoding="utf-8")
    monkeypatch.setattr(shelters, "SHELTERS_DATA_PATH", path)
    return path


def _request(
    *, lat: float = 59.0, lon: float = 18.0, params: dict[str, object] | None = None
) -> httpx.Response:
    async def run_request() -> httpx.Response:
        application = create_app(Settings(cors_origins=[]))
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=application), base_url="http://backend.example"
        ) as client:
            query = {"lat": lat, "lon": lon} if params is None else params
            return await client.get("/api/v1/shelters/nearest", params=query)

    return asyncio.run(run_request())


def _bounds_request(
    *,
    north: float = 60.0,
    south: float = 58.0,
    east: float = 19.0,
    west: float = 17.0,
    params: dict[str, object] | None = None,
) -> httpx.Response:
    async def run_request() -> httpx.Response:
        application = create_app(Settings(cors_origins=[]))
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=application), base_url="http://backend.example"
        ) as client:
            query = (
                {"north": north, "south": south, "east": east, "west": west}
                if params is None
                else params
            )
            return await client.get("/api/v1/shelters/within-bounds", params=query)

    return asyncio.run(run_request())


def _assert_failure(response: httpx.Response, status: int, code: str) -> None:
    assert response.status_code == status
    assert response.headers["Cache-Control"] == "no-store"
    assert response.json()["error"]["code"] == code
    assert isinstance(response.json()["error"]["message"], str)
    assert response.json()["error"]["message"]


def test_returns_nearest_shelters_sorted_by_distance(shelters_file: Path) -> None:
    """Sorts by distance from the query point and caps the result at five."""
    # Latitude increases northward, so each entry here is farther from (59.0, 18.0) than the
    # last - deliberately out of order in the file to prove sorting, not file order, wins.
    far_to_near = [_shelter(str(i), lat=59.0 + i * 0.1, lon=18.0) for i in range(6, 0, -1)]
    shelters_file.write_text(json.dumps(far_to_near), encoding="utf-8")

    response = _request()

    assert response.status_code == 200
    body = response.json()
    assert [shelter["id"] for shelter in body["shelters"]] == ["1", "2", "3", "4", "5"]
    assert len(body["shelters"]) == 5


def test_fewer_than_five_available_returns_all(shelters_file: Path) -> None:
    """Returns everything available rather than padding or failing when under the cap."""
    shelters_file.write_text(json.dumps([_shelter("1"), _shelter("2", lat=59.1)]), encoding="utf-8")

    response = _request()

    assert response.status_code == 200
    assert len(response.json()["shelters"]) == 2


def test_maps_shelter_fields_through_unchanged(shelters_file: Path) -> None:
    """Keeps the bundled fields intact in the response."""
    shelters_file.write_text(
        json.dumps([_shelter("1", address="Kantarellen 11", capacity=200)]), encoding="utf-8"
    )

    response = _request()

    shelter = response.json()["shelters"][0]
    assert shelter["number"] == "120599-3"
    assert shelter["address"] == "Kantarellen 11"
    assert shelter["capacity"] == 200
    assert shelter["type"] == "Skyddsrum"
    assert shelter["lat"] == pytest.approx(59.0)
    assert shelter["lon"] == pytest.approx(18.0)


def test_shelter_without_optional_fields_maps_to_null(shelters_file: Path) -> None:
    """Treats missing optional fields as null rather than failing the whole response."""
    shelters_file.write_text(
        json.dumps([_shelter("1", number=None, address=None, capacity=None, shelter_type=None)]),
        encoding="utf-8",
    )

    response = _request()

    shelter = response.json()["shelters"][0]
    assert shelter["number"] is None
    assert shelter["address"] is None
    assert shelter["capacity"] is None
    assert shelter["type"] is None


def test_no_shelters_in_snapshot_is_not_an_error(shelters_file: Path) -> None:
    """Returns an empty shelter list with 200, matching the old live-lookup's contract."""
    shelters_file.write_text("[]", encoding="utf-8")

    response = _request()

    assert response.status_code == 200
    assert response.json()["shelters"] == []
    assert response.json()["bboxRadiusMetersUsed"] == 0


def test_response_includes_full_source_metadata(shelters_file: Path) -> None:
    """Keeps every field the frontend's strict response validator requires non-empty."""
    response = _request()

    source = response.json()["source"]
    assert source["name"]
    assert source["url"]
    assert source["apiName"]
    assert source["apiUrl"]


def test_bbox_radius_used_is_a_positive_distance(shelters_file: Path) -> None:
    """Reports a real distance (not a BBOX setting) to the farthest returned shelter."""
    shelters_file.write_text(json.dumps([_shelter("1", lat=59.1)]), encoding="utf-8")

    response = _request()

    assert isinstance(response.json()["bboxRadiusMetersUsed"], int)
    assert response.json()["bboxRadiusMetersUsed"] > 0


@pytest.mark.parametrize(
    ("params", "reason"),
    [
        ({"lon": "18.0"}, "missing lat"),
        ({"lat": "59.3"}, "missing lon"),
        ({"lat": "91", "lon": "18.0"}, "out-of-range lat"),
        ({"lat": "59.3", "lon": "181"}, "out-of-range lon"),
    ],
    ids=["missing-lat", "missing-lon", "out-of-range-lat", "out-of-range-lon"],
)
def test_rejects_invalid_query_params(
    shelters_file: Path, params: dict[str, str], reason: str
) -> None:
    """Rejects missing or out-of-range coordinates with FastAPI's own validation response."""
    response = _request(params=params)
    assert response.status_code == 422, reason


@pytest.mark.parametrize("content", [b"", b"{", b"\xff", b"null", b"{}", b'[{"id": ""}]'])
def test_rejects_invalid_file_content(shelters_file: Path, content: bytes) -> None:
    """Returns a readable 500 response for JSON, encoding and schema failures alike."""
    shelters_file.write_bytes(content)

    response = _request()

    _assert_failure(response, 500, "shelters_data_unavailable")
    assert str(shelters_file) not in response.text


def test_missing_file_does_not_stop_application_startup(shelters_file: Path) -> None:
    """Keeps unrelated endpoints available and treats a missing file as a data failure."""
    shelters_file.unlink()

    async def run_request() -> httpx.Response:
        application = create_app(Settings(cors_origins=[]))
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=application), base_url="http://backend.example"
        ) as client:
            return await client.get("/health")

    health_response = asyncio.run(run_request())
    assert health_response.json() == {"status": "ok"}
    _assert_failure(_request(), 500, "shelters_data_unavailable")


def test_reports_unreadable_file(shelters_file: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Handles permission errors consistently on every CI operating system."""

    def deny_read(*_args: object, **_kwargs: object) -> str:
        raise PermissionError("Synthetic permission error")

    monkeypatch.setattr(Path, "read_text", deny_read)

    _assert_failure(_request(), 500, "shelters_data_unavailable")


def test_caches_the_snapshot_after_the_first_successful_load(shelters_file: Path) -> None:
    """Serves later requests on the same instance from memory instead of re-reading the file.

    60,000+ records are too expensive to re-parse on every request (see LocalShelterStore's
    docstring) - unlike crisis.py, which deliberately re-reads its small file every time.
    """

    async def run_two_requests() -> tuple[httpx.Response, httpx.Response]:
        application = create_app(Settings(cors_origins=[]))
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=application), base_url="http://backend.example"
        ) as client:
            first = await client.get("/api/v1/shelters/nearest", params={"lat": 59.0, "lon": 18.0})
            shelters_file.unlink()
            second = await client.get("/api/v1/shelters/nearest", params={"lat": 59.0, "lon": 18.0})
            return first, second

    first, second = asyncio.run(run_two_requests())

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json() == first.json()


def test_source_path_does_not_depend_on_working_directory(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Finds the bundled snapshot from its module path instead of the process directory."""
    monkeypatch.chdir(tmp_path)
    assert len(shelters.load_local_shelters()) > 0


def test_within_bounds_returns_only_shelters_inside_the_rectangle(shelters_file: Path) -> None:
    """Filters a mix of inside/outside shelters down to just the ones within the rectangle."""
    shelters_file.write_text(
        json.dumps(
            [
                _shelter("inside-1", lat=59.0, lon=18.0),
                _shelter("inside-2", lat=58.5, lon=17.5),
                _shelter("outside-north", lat=61.0, lon=18.0),
                _shelter("outside-south", lat=57.0, lon=18.0),
                _shelter("outside-east", lat=59.0, lon=20.0),
                _shelter("outside-west", lat=59.0, lon=16.0),
            ]
        ),
        encoding="utf-8",
    )

    response = _bounds_request(north=60.0, south=58.0, east=19.0, west=17.0)

    assert response.status_code == 200
    ids = {shelter["id"] for shelter in response.json()["shelters"]}
    assert ids == {"inside-1", "inside-2"}


def test_within_bounds_includes_points_on_the_boundary_edges(shelters_file: Path) -> None:
    """Treats a shelter exactly on a rectangle edge as inside, not outside."""
    shelters_file.write_text(
        json.dumps(
            [
                _shelter("on-north", lat=60.0, lon=18.0),
                _shelter("on-south", lat=58.0, lon=18.0),
                _shelter("on-east", lat=59.0, lon=19.0),
                _shelter("on-west", lat=59.0, lon=17.0),
            ]
        ),
        encoding="utf-8",
    )

    response = _bounds_request(north=60.0, south=58.0, east=19.0, west=17.0)

    ids = {shelter["id"] for shelter in response.json()["shelters"]}
    assert ids == {"on-north", "on-south", "on-east", "on-west"}


def test_within_bounds_empty_result_is_not_an_error(shelters_file: Path) -> None:
    """Returns 200 with an empty list for a rectangle that matches nothing (e.g. open sea)."""
    shelters_file.write_text(json.dumps([_shelter("1", lat=59.0, lon=18.0)]), encoding="utf-8")

    response = _bounds_request(north=10.0, south=5.0, east=10.0, west=5.0)

    assert response.status_code == 200
    assert response.json()["shelters"] == []


def test_within_bounds_does_not_cap_result_size(shelters_file: Path) -> None:
    """Returns every match, proving this doesn't accidentally reuse the nearest-endpoint's cap."""
    many = [_shelter(str(i), lat=59.0 + i * 0.01, lon=18.0) for i in range(8)]
    shelters_file.write_text(json.dumps(many), encoding="utf-8")

    response = _bounds_request(north=60.0, south=58.0, east=19.0, west=17.0)

    assert len(response.json()["shelters"]) == 8


def test_within_bounds_response_has_no_bbox_radius_field(shelters_file: Path) -> None:
    """Doesn't carry the nearest-endpoint's distance-based field, which has no meaning here."""
    response = _bounds_request()
    assert "bboxRadiusMetersUsed" not in response.json()


def test_within_bounds_response_includes_full_source_metadata(shelters_file: Path) -> None:
    """Keeps every field the frontend's strict response validator requires non-empty."""
    response = _bounds_request()

    source = response.json()["source"]
    assert source["name"]
    assert source["url"]
    assert source["apiName"]
    assert source["apiUrl"]


@pytest.mark.parametrize(
    ("params", "reason"),
    [
        ({"south": "58", "east": "19", "west": "17"}, "missing north"),
        ({"north": "60", "east": "19", "west": "17"}, "missing south"),
        ({"north": "60", "south": "58", "west": "17"}, "missing east"),
        ({"north": "60", "south": "58", "east": "19"}, "missing west"),
        ({"north": "91", "south": "58", "east": "19", "west": "17"}, "out-of-range north"),
        ({"north": "60", "south": "-91", "east": "19", "west": "17"}, "out-of-range south"),
        ({"north": "60", "south": "58", "east": "181", "west": "17"}, "out-of-range east"),
        ({"north": "60", "south": "58", "east": "19", "west": "-181"}, "out-of-range west"),
    ],
)
def test_within_bounds_rejects_invalid_query_params(
    shelters_file: Path, params: dict[str, str], reason: str
) -> None:
    """Rejects missing or out-of-range coordinates with FastAPI's own validation response."""
    response = _bounds_request(params=params)
    assert response.status_code == 422, reason


def test_within_bounds_inverted_rectangle_returns_empty_not_error(shelters_file: Path) -> None:
    """Documents the accepted limitation: an inverted rectangle just matches nothing."""
    shelters_file.write_text(json.dumps([_shelter("1", lat=59.0, lon=18.0)]), encoding="utf-8")

    response = _bounds_request(north=58.0, south=60.0, east=19.0, west=17.0)

    assert response.status_code == 200
    assert response.json()["shelters"] == []


@pytest.mark.parametrize("content", [b"", b"{", b"\xff", b"null", b"{}", b'[{"id": ""}]'])
def test_within_bounds_rejects_invalid_file_content(shelters_file: Path, content: bytes) -> None:
    """Returns a readable 500 response for JSON, encoding and schema failures alike."""
    shelters_file.write_bytes(content)

    response = _bounds_request()

    _assert_failure(response, 500, "shelters_data_unavailable")
    assert str(shelters_file) not in response.text


def test_within_bounds_caches_the_snapshot_after_first_load(shelters_file: Path) -> None:
    """Serves a second request from the same in-memory store, not by re-reading the file."""

    async def run_two_requests() -> tuple[httpx.Response, httpx.Response]:
        application = create_app(Settings(cors_origins=[]))
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=application), base_url="http://backend.example"
        ) as client:
            params = {"north": 60.0, "south": 58.0, "east": 19.0, "west": 17.0}
            first = await client.get("/api/v1/shelters/within-bounds", params=params)
            shelters_file.unlink()
            second = await client.get("/api/v1/shelters/within-bounds", params=params)
            return first, second

    first, second = asyncio.run(run_two_requests())

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json() == first.json()
