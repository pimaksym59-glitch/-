"""Deterministic, offline context-source fakes. Default to empty (no context) so the engine runs
fully offline; a fixed-item variant supports assertions. No randomness, no I/O.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence

from app.content.sources import ContextItem


class EmptyMemorySource:
    async def few_shot(
        self, *, channel_id: uuid.UUID | None, topic: str | None, limit: int
    ) -> list[ContextItem]:
        return []


class EmptyKnowledgeSource:
    async def relevant(
        self, *, channel_id: uuid.UUID | None, query: str, limit: int
    ) -> list[ContextItem]:
        return []


class FixedMemorySource:
    """Returns a fixed list (truncated to ``limit``) — deterministic, for tests."""

    def __init__(self, items: Sequence[ContextItem]) -> None:
        self._items = list(items)

    async def few_shot(
        self, *, channel_id: uuid.UUID | None, topic: str | None, limit: int
    ) -> list[ContextItem]:
        return self._items[:limit]


class FixedKnowledgeSource:
    def __init__(self, items: Sequence[ContextItem]) -> None:
        self._items = list(items)

    async def relevant(
        self, *, channel_id: uuid.UUID | None, query: str, limit: int
    ) -> list[ContextItem]:
        return self._items[:limit]
