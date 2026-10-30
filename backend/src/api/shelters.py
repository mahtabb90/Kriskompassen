"""Exposes the nearest civil-defense shelters for one position from the local snapshot."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response

from src.api.dependencies import get_shelter_store
from src.models.shelter import ShelterDataErrorResponse, ShelterListResponse
from src.services.shelters import LocalShelterStore, build_shelters_response

router = APIRouter(prefix="/shelters", tags=["shelters"])


@router.get(
    "/nearest",
    response_model=ShelterListResponse,
    responses={500: {"model": ShelterDataErrorResponse, "description": "Local data failure."}},
)
def get_nearest_shelters(
    response: Response,
    lat: Annotated[float, Query(ge=-90, le=90)],
    lon: Annotated[float, Query(ge=-180, le=180)],
    store: Annotated[LocalShelterStore, Depends(get_shelter_store)],
) -> ShelterListResponse:
    """Returns the nearest civil-defense shelters to (lat, lon) from the bundled local snapshot.

    An empty shelter list would only happen if the snapshot itself were empty; it is not an
    error. Raises ShelterDataError if the bundled snapshot is missing or invalid. Synchronous,
    like src/api/crisis.py, so the snapshot's disk I/O (only on first access; see
    LocalShelterStore) runs in FastAPI's thread pool.
    """
    shelters = store.get_shelters()
    result = build_shelters_response(shelters, lat, lon)
    response.headers["Cache-Control"] = "no-store"
    return result
