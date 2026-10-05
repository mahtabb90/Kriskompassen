"""Exposes a health endpoint that does not call any external service."""

from fastapi import APIRouter

from src.models.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def get_health() -> HealthResponse:
    """Reports that the backend is running, even when its upstream source is unavailable."""
    return HealthResponse()
