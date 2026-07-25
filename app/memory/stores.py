"""Memory store abstraction (§R9.1/§R9.2, owner req 2/8) — Protocol only. The Memory subsystem
has its
own store, independent of Knowledge; it reuses the neutral retrieval kernel (similarity,
SearchResult)
but never imports Knowledge (owner req 9). Channel isolation is enforced on search (§R9.2).
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from typing import Protocol

from app.memory.types import MemoryEntry
from app.rag.filters import matches
from app.rag.similarity import CosineSimilarity, Similarity
from app.rag.types import Chunk, Metadata, SearchFilter, SearchResult


class MemoryStore(Protocol):
    async def add(self, entries: Sequence[MemoryEntry]) -> None: ...

    async def search(
        self, query_vector: Sequence[float], *, channel_id: uuid.UUID | None, limit: int
    ) -> list[SearchResult]: ...


class FakeMemoryStore:
    """Deterministic in-memory store: channel hard-filter + cosine + top-k. No randomness, no
    I/O."""

    def __init__(self, similarity: Similarity | None = None) -> None:
        self._entries: dict[uuid.UUID, MemoryEntry] = {}
        self._similarity = similarity if similarity is not None else CosineSimilarity()

    async def add(self, entries: Sequence[MemoryEntry]) -> None:
        for entry in entries:
            self._entries[entry.id] = entry

    async def search(
        self, query_vector: Sequence[float], *, channel_id: uuid.UUID | None, limit: int
    ) -> list[SearchResult]:
        search_filter = SearchFilter(channel_id=channel_id, include_global=True, active_only=False)
        scored: list[SearchResult] = []
        for entry in self._entries.values():
            if entry.embedding is None:
                continue
            chunk = _as_chunk(entry)
            if not matches(chunk.metadata, search_filter):
                continue
            score = self._similarity.score(query_vector, entry.embedding)
            scored.append(SearchResult(chunk=chunk, score=score))
        scored.sort(key=lambda result: (result.score, str(result.chunk.id)), reverse=True)
        return scored[:limit]


def _as_chunk(entry: MemoryEntry) -> Chunk:
    return Chunk(
        id=entry.id,
        document_id=entry.id,
        ordinal=0,
        text=entry.text,
        metadata=Metadata(channel_id=entry.channel_id, doc_type=entry.kind),
        embedding=entry.embedding,
    )
