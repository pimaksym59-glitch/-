"""Cache integration point (owner req 14, §R9) — **infrastructure seam only**, no implementation. A
real cache (e.g. Redis-backed) plugs in later; the default is a no-op that always misses.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

from app.rag.types import SearchResult


class CacheSeam(Protocol):
    async def get(self, key: str) -> list[SearchResult] | None: ...

    async def put(self, key: str, results: Sequence[SearchResult]) -> None: ...


class NoOpCache:
    async def get(self, key: str) -> list[SearchResult] | None:
        return None

    async def put(self, key: str, results: Sequence[SearchResult]) -> None: ...
