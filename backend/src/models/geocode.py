"""Normalizes Nominatim's reverse-geocoding response into a stable public shape."""

import math

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UpstreamGeocodeResult(BaseModel):
    """Validates a successful Nominatim reverse-geocode result.

    Nominatim encodes latitude and longitude as JSON strings, not numbers; the validator
    parses and finite-checks them. Unknown upstream fields are ignored.
    """

    model_config = ConfigDict(strict=True)

    lat: float
    lon: float
    display_name: str
    address: dict[str, str] = Field(default_factory=dict)

    @field_validator("lat", "lon", mode="before")
    @classmethod
    def _parse_coordinate(cls, value: object) -> float:
        """Parses Nominatim's string-encoded coordinate and rejects non-finite values."""
        if not isinstance(value, str):
            raise ValueError("Nominatim must encode coordinates as JSON strings.")
        number = float(value)
        if not math.isfinite(number):
            raise ValueError("Coordinate value is not finite.")
        return number


class GeocodeSource(BaseModel):
    """Identifies the upstream provider without exposing URL credentials."""

    name: str = "OpenStreetMap-bidragsgivare"
    url: str = "https://www.openstreetmap.org/copyright"
    apiName: str = "Nominatim"
    apiUrl: str


class GeocodeResponse(BaseModel):
    """Reports a reverse-geocode outcome; a negative result is not an upstream failure.

    found is False both when Nominatim reports no result and when its response cannot be
    read as a complete address, so the frontend never has to distinguish those two cases.
    """

    found: bool
    address: str | None = None
    municipality: str | None = None
    county: str | None = None
    lat: float | None = None
    lon: float | None = None
    message: str | None = None
    source: GeocodeSource


class GeocodeCandidate(BaseModel):
    """One address match from a forward geocode search, e.g. for a manually typed address."""

    address: str
    municipality: str | None = None
    county: str | None = None
    lat: float
    lon: float


class GeocodeSearchResponse(BaseModel):
    """Reports every address match found for a free-text query, most relevant first.

    An empty candidate list is a normal outcome for a query Nominatim cannot resolve, not an
    UpstreamError.
    """

    candidates: list[GeocodeCandidate]
    source: GeocodeSource
