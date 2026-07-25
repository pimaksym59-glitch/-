"""Unified API Error Schema (API_SPEC). Every error response — validation, domain, or unexpected —
is serialized as ``{"error": {code, message, details, request_id}}`` so clients get one shape.
"""

from __future__ import annotations

from typing import Any

from pydantic import Field

from app.schemas.base import Schema


class ErrorDetail(Schema):
    code: str = Field(description="Stable machine-readable error code, e.g. 'not_found'.")
    message: str = Field(description="Human-readable message; never leaks internals/stack traces.")
    details: dict[str, Any] = Field(
        default_factory=dict, description="Optional structured context."
    )
    request_id: str | None = Field(default=None, description="Correlates with the X-Request-ID.")


class ErrorResponse(Schema):
    error: ErrorDetail
