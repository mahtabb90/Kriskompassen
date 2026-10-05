"""Validates the verified VMA response structure without assuming message fields."""

from pydantic import ConfigDict, JsonValue, RootModel


class VmaResponse(RootModel[list[dict[str, JsonValue]]]):
    """Requires a JSON object array, preserving all fields and allowing an empty list.

    This validates structure only. It does not verify identifiers, message content,
    geographic areas, timestamps, or whether a message is still active.
    """

    model_config = ConfigDict(strict=True)
