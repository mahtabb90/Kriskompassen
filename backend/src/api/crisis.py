"""Serves complete curated articles from a replaceable file-reading service."""

from fastapi import APIRouter, Response

from src.core.errors import CrisisError
from src.models.crisis import CrisisArticle, CrisisErrorResponse
from src.services.crisis import load_crisis_articles

router = APIRouter(prefix="/crisis", tags=["crisis"])


@router.get(
    "",
    response_model=list[CrisisArticle],
    response_model_exclude_none=True,
    responses={500: {"model": CrisisErrorResponse}},
)
def get_crisis_articles(response: Response) -> list[CrisisArticle]:
    """Returns full articles, allowing list cards to save complete offline copies."""
    articles = load_crisis_articles()
    response.headers["Cache-Control"] = "no-store"
    return articles


@router.get(
    "/{article_id}",
    response_model=CrisisArticle,
    response_model_exclude_none=True,
    responses={404: {"model": CrisisErrorResponse}, 500: {"model": CrisisErrorResponse}},
)
def get_crisis_article(article_id: str, response: Response) -> CrisisArticle:
    """Finds an article only after validating the complete source; file failures remain 500."""
    articles = load_crisis_articles()
    for article in articles:
        if article.id == article_id:
            response.headers["Cache-Control"] = "no-store"
            return article
    raise CrisisError("crisis_not_found", "Den informationen hittades inte.", 404)
