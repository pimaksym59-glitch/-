"""Generic pagination DTO (API_SPEC) — entity-agnostic. ``Page[T]`` wraps any item schema so every
list endpoint returns ``{items, total, next_cursor}`` without per-entity duplication (§R3).
"""

from __future__ import annotations

from pydantic import Field

from app.schemas.base import Schema


class Page[T](Schema):
    """One page of results. ``total`` is the full count when known; ``next_cursor`` drives cursor
    pagination (None on the last page)."""

    items: list[T]
    total: int | None = Field(default=None, ge=0, description="Full count when cheap to compute.")
    next_cursor: str | None = Field(default=None, description="Opaque cursor for the next page.")
