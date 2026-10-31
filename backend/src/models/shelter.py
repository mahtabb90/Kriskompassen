"""Normalizes MCF's shelter data into a stable public shape."""

from pydantic import BaseModel

from src.core.errors import ShelterDataErrorCode


class Shelter(BaseModel):
    """One civil-defense shelter, mapped from an MCF WFS feature's properties.

    address is MCF's free-text additionallocationdescription (e.g. a building name), not a
    verified postal address - MCF's data has no street-address field, and the same property can
    host several separate shelters that all share this same text (even the same coordinates and
    capacity) - number (MCF's "name", e.g. "120599-3") is the only field that reliably tells two
    such shelters apart, and matches the number physically posted at a shelter's entrance. type
    is MCF's statustype (e.g. "Skyddsrum"), not an availability status; shelter status is out of
    scope for this API.
    """

    id: str
    number: str | None = None
    address: str | None = None
    lat: float
    lon: float
    capacity: int | None = None
    type: str | None = None


class ShelterSource(BaseModel):
    """Identifies the upstream provider and where its open-data terms are documented.

    MCF's Geodataportalen metadata record states the resource has no access or reuse
    restrictions ("inga begränsningar" / "inga tillämpliga villkor"). apiUrl names the
    collection the bundled snapshot (backend/src/data/shelters.json) was fetched from, not a
    live endpoint called per request - this MVP reads a static, committed file; see
    src/services/shelters.py.
    """

    name: str = "Myndigheten för civilt försvar (MCF)"
    url: str = (
        "https://www.geodata.se/geodataportalen/srv/swe/catalog.search"
        "#/metadata/6341813c-bfa3-45df-8234-13cf583bf533"
    )
    apiName: str = "MCF OGC API Features"
    apiUrl: str = (
        "https://inspire.mcf.se/skyddsrum/ogc/features/v1/collections/US_civilProtectionSite/items"
    )


class ShelterListResponse(BaseModel):
    """Reports the nearest shelters found, sorted by distance from the requested position.

    An empty shelters list is a normal outcome for a sparsely covered area, not an error.
    bboxRadiusMetersUsed is the rounded distance to the farthest returned shelter, not a
    search-radius setting - kept under its original name so the response contract this app's
    frontend already validates stays unchanged even though this MVP no longer widens a BBOX.
    """

    shelters: list[Shelter]
    source: ShelterSource
    bboxRadiusMetersUsed: int


class ShelterBoundsResponse(BaseModel):
    """Reports every shelter from the local snapshot whose coordinates fall within one
    rectangular map viewport.

    No bboxRadiusMetersUsed field, unlike ShelterListResponse - there is no "distance to the
    farthest match" concept for a bounding-box query.
    """

    shelters: list[Shelter]
    source: ShelterSource


class ShelterDataErrorDetail(BaseModel):
    """Describes a local shelter-data failure using a public code and Swedish message."""

    code: ShelterDataErrorCode
    message: str


class ShelterDataErrorResponse(BaseModel):
    """Uses the existing error envelope without classifying a local failure as an upstream one."""

    error: ShelterDataErrorDetail
