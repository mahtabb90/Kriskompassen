"""Normalizes MCF's shelter data into a stable public shape."""

from pydantic import BaseModel


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
    restrictions ("inga begränsningar" / "inga tillämpliga villkor").
    """

    name: str = "Myndigheten för civilt försvar (MCF)"
    url: str = (
        "https://www.geodata.se/geodataportalen/srv/swe/catalog.search"
        "#/metadata/6341813c-bfa3-45df-8234-13cf583bf533"
    )
    apiName: str = "MCF WFS (OGC API Features)"
    apiUrl: str


class ShelterListResponse(BaseModel):
    """Reports the nearest shelters found within the search radius actually used.

    An empty shelters list is a normal outcome for a sparsely covered area, not an error.
    """

    shelters: list[Shelter]
    source: ShelterSource
    bboxRadiusMetersUsed: int
