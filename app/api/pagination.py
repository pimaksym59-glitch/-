"""Pagination infrastructure (API_SPEC) — entity-agnostic DI dependencies. Offset and cursor forms
both cap ``limit`` at 100 (§API_SPEC); out-of-range values fail request validation (422). The
response shape is the generic ``Page[T]`` (``app.schemas.pagination``) — no per-entity coupling.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated

from fastapi import Query

_DEFAULT_LIMIT = 50
_MAX_LIMIT = 100

LimitQuery = Annotated[int, Query(ge=1, le=_MAX_LIMIT)]
OffsetQuery = Annotated[int, Query(ge=0)]
CursorQuery = Annotated[str | None, Query()]


@dataclass(frozen=True, slots=True)
class PageParams:
    limit: int
    offset: int


@dataclass(frozen=True, slots=True)
class CursorParams:
    cursor: str | None
    limit: int


def page_params(limit: LimitQuery = _DEFAULT_LIMIT, offset: OffsetQuery = 0) -> PageParams:
    """Offset pagination dependency: ``?limit=<=100&offset=``."""
    return PageParams(limit=limit, offset=offset)


def cursor_params(cursor: CursorQuery = None, limit: LimitQuery = _DEFAULT_LIMIT) -> CursorParams:
    """Cursor pagination dependency: ``?cursor=&limit=<=100``."""
    return CursorParams(cursor=cursor, limit=limit)
