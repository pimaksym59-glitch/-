"""Memory context source (§R9.1/§R5.2) — implements the Stage-12 ``MemoryContextSource`` port. It
retrieves channel-scoped few-shot examples from the memory store via the neutral kernel (embed ->
search
-> rank -> assemble). Independent of Knowledge; the only link is the AI-Engine context port (owner
req 8). No business logic.
"""

from __future__ import annotations

import time
import uuid

from app.content.sources import ContextItem
from app.memory.stores import MemoryStore
from app.rag.assembly import ContextAssembler
from app.rag.embedding import Embedder
from app.rag.observability import RagObservability
from app.rag.ranking import Ranker, ScoreRanker


class MemoryRetriever:
    """Implements the Stage-12 ``MemoryContextSource`` port (few-shot, K=3-5, §R5.2)."""

    def __init__(
        self,
        store: MemoryStore,
        embedder: Embedder,
        assembler: ContextAssembler,
        *,
        ranker: Ranker | None = None,
        budget: int = 8000,
        observability: RagObservability | None = None,
    ) -> None:
        self._store = store
        self._embedder = embedder
        self._assembler = assembler
        self._ranker = ranker if ranker is not None else ScoreRanker()
        self._budget = budget
        self._obs = observability if observability is not None else RagObservability()

    async def few_shot(
        self, *, channel_id: uuid.UUID | None, topic: str | None, limit: int
    ) -> list[ContextItem]:
        if not topic:
            return []  # no topic -> no semantic query; the engine still has persona examples
        started = time.perf_counter()
        vector = await self._embedder.embed_query(topic)
        results = self._ranker.rank(
            await self._store.search(vector, channel_id=channel_id, limit=max(limit, 1))
        )
        items = self._assembler.assemble(results, budget=self._budget, limit=limit)
        self._obs.metrics.incr("rag.memory.query")
        self._obs.logger.event(
            "rag.memory",
            found=len(results),
            used=len(items),
            search_ms=round((time.perf_counter() - started) * 1000, 2),
        )
        return items
