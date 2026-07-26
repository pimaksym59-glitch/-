"""Pagination component (owner req 15) — a standalone, entity-agnostic paginator.

Independent of ``app/schemas`` and any web framework. Caps the page size and returns a generic
``Page[T]``.

"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

_MAX_LIMIT = 100


@dataclass(frozen=True, slots=True)
class PageRequest:
    """Offset pagination request (limit is capped at 100)."""

    limit: int = 50
    offset: int = 0

    def __post_init__(self) -> None:
        if self.limit < 1 or self.limit > _MAX_LIMIT:
            raise ValueError("limit must be within [1, 100]")
        if self.offset < 0:
            raise ValueError("offset must be non-negative")


@dataclass(frozen=True, slots=True)
class Page[T]:
    """A page of items plus the total count (for the caller to compute more pages)."""

    items: tuple[T, ...]
    total: int
    limit: int
    offset: int


def paginate[T](items: Sequence[T], request: PageRequest) -> Page[T]:
    """Slice ``items`` per ``request`` into a generic :class:`Page`."""

    window = tuple(items[request.offset : request.offset + request.limit])
    return Page(items=window, total=len(items), limit=request.limit, offset=request.offset)
