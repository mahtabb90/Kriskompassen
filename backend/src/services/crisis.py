"""Reads and validates the complete article file on demand without persistent state."""

from pathlib import Path

from pydantic import TypeAdapter

from src.core.errors import CrisisError
from src.models.crisis import CrisisArticle

CRISIS_DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "crisis.json"
_ARTICLES = TypeAdapter(list[CrisisArticle])


def load_crisis_articles() -> list[CrisisArticle]:
    """Returns all validated articles in file order, including a valid empty list.

    Called from synchronous FastAPI routes so disk I/O runs in its thread pool.
    Raises CrisisError for file, encoding, JSON, schema or duplicate-ID failures.
    No article ID is ever used to construct the path. Nothing is read at import time.
    """
    try:
        articles = _ARTICLES.validate_json(CRISIS_DATA_PATH.read_text(encoding="utf-8"))
        identifiers = [article.id for article in articles]
        if len(set(identifiers)) != len(identifiers):
            raise ValueError("Article IDs must be unique.")
        return articles
    except (OSError, ValueError) as error:
        raise CrisisError(
            "crisis_data_unavailable", "Krisinformationen kunde inte läsas.", 500
        ) from error
