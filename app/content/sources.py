"""Context source ports (§R5.2, §R9.8, owner req 6). The context builder pulls few-shot examples and
knowledge **only** through these interfaces — never the DB directly. Real Memory/RAG adapters land
in Stage 13 (dependency inversion, mirroring the provider protocols of Stage 11).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True, slots=True)
class ContextItem:
    kind: str  # "example" | "knowledge"
    text: str
    source: str | None = None


class MemoryContextSource(Protocol):
    """Few-shot examples for the prompt (K=3-5, §R5.2) — e.g. similar past posts."""

    async def few_shot(
        self, *, channel_id: uuid.UUID | None, topic: str | None, limit: int
    ) -> list[ContextItem]: ...


class KnowledgeContextSource(Protocol):
    """Relevant knowledge-base chunks for the prompt (§R9.3)."""

    async def relevant(
        self, *, channel_id: uuid.UUID | None, query: str, limit: int
    ) -> list[ContextItem]: ...
