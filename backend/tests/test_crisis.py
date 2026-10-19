"""Checks file-backed articles and their public API without external requests."""

import asyncio
import json
from pathlib import Path

import httpx
import pytest

from src.app import create_app
from src.core.config import Settings
from src.services import crisis

ARTICLE = {
    "id": "test-article",
    "title": "Testartikel",
    "description": "En sammanfattning.",
    "content": "Första stycket.\n\nAndra stycket med å, ä och ö.",
    "source": "Testkälla",
    "sourceUrl": "https://example.com/article/",
    "fetchedAt": "2026-09-28T15:04:37.079Z",
}
ORIGIN = "https://frontend.example"


def _request(path: str, *, origin: str = ORIGIN) -> httpx.Response:
    async def run_request() -> httpx.Response:
        application = create_app(Settings(cors_origins=[ORIGIN]))
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=application), base_url="http://backend.example"
        ) as client:
            return await client.get(path, headers={"Origin": origin})

    return asyncio.run(run_request())


@pytest.fixture
def article_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Replaces only the data-file boundary; routing and validation remain real."""
    path = tmp_path / "crisis.json"
    path.write_text(json.dumps([ARTICLE], ensure_ascii=False), encoding="utf-8")
    monkeypatch.setattr(crisis, "CRISIS_DATA_PATH", path)
    return path


def _assert_failure(response: httpx.Response, status: int, code: str) -> None:
    assert response.status_code == status
    assert response.headers["Cache-Control"] == "no-store"
    assert response.headers["Access-Control-Allow-Origin"] == ORIGIN
    assert set(response.json()) == {"error"}
    assert response.json()["error"]["code"] == code
    assert response.json()["error"]["message"]


def test_bundled_articles_preserve_the_original_dataset() -> None:
    """Keeps existing offline keys, order, provenance and compilation time stable."""
    articles = crisis.load_crisis_articles()
    assert [article.id for article in articles] == [
        "food-in-crisis",
        "drinking-water-in-crisis",
        "medication-in-crisis",
        "heating-in-crisis",
        "communication-in-crisis",
        "hygiene-in-crisis",
    ]
    assert [article.title for article in articles] == [
        "Mat i kris",
        "Dricksvatten i kris",
        "Läkemedel i kris",
        "Värme i kris",
        "Kommunikation i kris",
        "Toalett och hygien i kris",
    ]
    assert all(article.source == "Krisinformation.se" for article in articles)
    assert all(article.fetchedAt == "2026-09-28T15:04:37.079Z" for article in articles)


def test_serves_full_articles_and_preserves_text(article_file: Path) -> None:
    """Includes full text in the list so offline saving needs no second request."""
    response = _request("/api/v1/crisis")
    assert response.status_code == 200
    assert response.json() == [ARTICLE]
    assert response.headers["Cache-Control"] == "no-store"
    assert response.headers["Access-Control-Allow-Origin"] == ORIGIN
    detail = _request("/api/v1/crisis/test-article")
    assert detail.status_code == 200
    assert detail.json() == ARTICLE
    assert detail.headers["Cache-Control"] == "no-store"
    assert detail.headers["Access-Control-Allow-Origin"] == ORIGIN


def test_optional_source_link_is_omitted(article_file: Path) -> None:
    """Does not emit null or device-local metadata into the article contract."""
    article = {key: value for key, value in ARTICLE.items() if key != "sourceUrl"}
    article_file.write_text(json.dumps([article]), encoding="utf-8")
    assert _request("/api/v1/crisis/test-article").json() == article


def test_unknown_id_uses_a_distinct_not_found_code(article_file: Path) -> None:
    """Lets clients distinguish a missing article from an undeployed API route."""
    _assert_failure(_request("/api/v1/crisis/missing"), 404, "crisis_not_found")


def test_empty_file_array_is_a_success(article_file: Path) -> None:
    """Distinguishes an intentionally empty source from malformed JSON."""
    article_file.write_text("[]", encoding="utf-8")
    response = _request("/api/v1/crisis")
    assert response.status_code == 200
    assert response.json() == []
    assert response.headers["Cache-Control"] == "no-store"
    _assert_failure(_request("/api/v1/crisis/missing"), 404, "crisis_not_found")


@pytest.mark.parametrize("path", ["/api/v1/crisis", "/api/v1/crisis/test-article"])
@pytest.mark.parametrize("content", [b"", b"{", b"\xff", b"null", b"{}", b"[null]"])
def test_rejects_invalid_file_content(article_file: Path, path: str, content: bytes) -> None:
    """Returns readable 500 responses for JSON, UTF-8 and container failures."""
    article_file.write_bytes(content)
    response = _request(path)
    _assert_failure(response, 500, "crisis_data_unavailable")
    assert str(article_file) not in response.text


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("id", ""),
        ("id", "../other"),
        ("id", "test-article\n"),
        ("title", 123),
        ("title", "  "),
        ("description", None),
        ("content", "\n"),
        ("source", ""),
        ("sourceUrl", "javascript:alert(1)"),
        ("sourceUrl", "/relative"),
        ("sourceUrl", "https://user:password@example.com/"),
        ("sourceUrl", "https://example.com:bad/"),
        ("sourceUrl", "https://example.com/\n"),
        ("sourceUrl", "https://example.com\\other"),
        ("fetchedAt", "2026-02-30T15:04:37.079Z"),
        ("fetchedAt", "0000-01-01T00:00:00.000Z"),
        ("fetchedAt", "2026-09-28T15:04:37.079"),
        ("fetchedAt", 123),
        ("savedOffline", True),
    ],
)
def test_rejects_invalid_article_fields(article_file: Path, field: str, value: object) -> None:
    """Never coerces bad article fields or accepts server-owned saving state."""
    article_file.write_text(json.dumps([{**ARTICLE, field: value}]), encoding="utf-8")
    _assert_failure(_request("/api/v1/crisis"), 500, "crisis_data_unavailable")


def test_validates_the_whole_source_before_returning_a_match(article_file: Path) -> None:
    """A malformed peer prevents partial lists and misleading detail/not-found responses."""
    article_file.write_text(json.dumps([ARTICLE, {"id": "broken"}]), encoding="utf-8")
    for path in ["/api/v1/crisis", "/api/v1/crisis/test-article", "/api/v1/crisis/missing"]:
        _assert_failure(_request(path), 500, "crisis_data_unavailable")


def test_rejects_duplicate_ids(article_file: Path) -> None:
    """Prevents ambiguous detail lookups and duplicate frontend keys."""
    article_file.write_text(json.dumps([ARTICLE, {**ARTICLE, "title": "Annan"}]), encoding="utf-8")
    _assert_failure(_request("/api/v1/crisis"), 500, "crisis_data_unavailable")


def test_missing_file_does_not_stop_application_startup(article_file: Path) -> None:
    """Keeps unrelated endpoints available and treats a missing file as a data failure."""
    article_file.unlink()
    assert _request("/health").json() == {"status": "ok"}
    _assert_failure(_request("/api/v1/crisis"), 500, "crisis_data_unavailable")


def test_reports_unreadable_file(article_file: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Handles permission errors consistently on every CI operating system."""

    def deny_read(*_args: object, **_kwargs: object) -> str:
        raise PermissionError("Synthetic permission error")

    monkeypatch.setattr(Path, "read_text", deny_read)
    _assert_failure(_request("/api/v1/crisis"), 500, "crisis_data_unavailable")


def test_reads_updates_on_each_request(article_file: Path) -> None:
    """Does not require restarting a local backend after editing its data file."""
    assert _request("/api/v1/crisis").json() == [ARTICLE]
    updated = {**ARTICLE, "content": "Ny text."}
    article_file.write_text(json.dumps([updated]), encoding="utf-8")
    assert _request("/api/v1/crisis").json() == [updated]


def test_source_path_does_not_depend_on_working_directory(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Finds the bundled source from its module path instead of the process directory."""
    monkeypatch.chdir(tmp_path)
    assert len(crisis.load_crisis_articles()) == 6


def test_unapproved_origin_has_no_cors_grant(article_file: Path) -> None:
    """Retains the application's exact-origin browser access policy."""
    response = _request("/api/v1/crisis", origin="https://unlisted.example")
    assert response.status_code == 200
    assert "Access-Control-Allow-Origin" not in response.headers
