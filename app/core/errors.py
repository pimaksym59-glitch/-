"""Application error taxonomy (§R3, API_SPEC). Neutral location so any layer (services, domain,
repositories, api) can raise these without violating the dependency direction (§R3.1) — the API
layer maps them to the unified Error Schema, but they carry no HTTP/FastAPI dependency themselves.

Each error carries a stable ``code``, an HTTP ``status_code``, and optional structured ``details``.
"""

from __future__ import annotations

from typing import Any


class AppError(Exception):
    """Base application error. Subclasses set ``status_code``/``code``; instances add message."""

    status_code: int = 500
    code: str = "internal_error"

    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details: dict[str, Any] = details or {}


class BadRequest(AppError):
    status_code = 400
    code = "bad_request"


class Unauthorized(AppError):
    status_code = 401
    code = "unauthorized"


class Forbidden(AppError):
    status_code = 403
    code = "forbidden"


class NotFound(AppError):
    status_code = 404
    code = "not_found"


class Conflict(AppError):
    status_code = 409
    code = "conflict"


class VersionConflict(Conflict):
    """Optimistic-lock version mismatch (§R4.2) — maps to 409."""

    code = "version_conflict"


class UnprocessableEntity(AppError):
    """Domain validation failure (distinct from request-shape validation) — maps to 422."""

    status_code = 422
    code = "unprocessable_entity"


class RateLimited(AppError):
    status_code = 429
    code = "rate_limited"
