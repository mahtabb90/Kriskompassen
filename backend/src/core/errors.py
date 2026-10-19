"""Defines upstream and local article failures independently of HTTP rendering."""

from typing import Literal

UpstreamErrorCode = Literal[
    "upstream_network_error",
    "upstream_http_error",
    "upstream_invalid_response",
    "upstream_timeout",
]


class UpstreamError(Exception):
    """Carries a public failure code and message without exposing upstream response bodies."""

    def __init__(self, code: UpstreamErrorCode, message: str, status_code: int = 502) -> None:
        """Initializes a gateway failure; timeouts use status 504 instead of the default 502."""
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


CrisisErrorCode = Literal["crisis_not_found", "crisis_data_unavailable"]


class CrisisError(Exception):
    """Carries an article failure without exposing data-file paths or contents."""

    def __init__(self, code: CrisisErrorCode, message: str, status_code: int) -> None:
        """Distinguishes a missing article from an unreadable or invalid data source."""
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
