"""Deterministic, in-memory store fakes (owner req 13) — offline stand-ins for real backends. They
apply the same hard filter (§R9.2) and score with :class:`CosineSimilarity`. No randomness, no I/O.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence

from app.rag.filters import matches
from app.rag.similarity import CosineSimilarity, Similarity
from app.rag.types import Chunk, Document, SearchFilter, SearchResult


class FakeVectorStore:
    """In-memory vector index: filter -> cosine score -> top-k. Deterministic."""

    def __init__(self, similarity: Similarity | None = None) -> None:
        self._chunks: dict[uuid.UUID, Chunk] = {}
        self._similarity = similarity if similarity is not None else CosineSimilarity()

    async def upsert(self, chunks: Sequence[Chunk]) -> None:
        for chunk in chunks:
            self._chunks[chunk.id] = chunk

    async def search(
        self, query_vector: Sequence[float], search_filter: SearchFilter, limit: int
    ) -> list[SearchResult]:
        scored: list[SearchResult] = []
        for chunk in self._chunks.values():
            if chunk.embedding is None or not matches(chunk.metadata, search_filter):
                continue
            score = self._similarity.score(query_vector, chunk.embedding)
            scored.append(SearchResult(chunk=chunk, score=score))
        # deterministic tie-break by chunk id
        scored.sort(key=lambda result: (result.score, str(result.chunk.id)), reverse=True)
        return scored[:limit]


class FakeDocumentStore:
    def __init__(self) -> None:
        self._documents: dict[uuid.UUID, Document] = {}

    async def put(self, document: Document) -> None:
        self._documents[document.id] = document

    async def get(self, document_id: uuid.UUID) -> Document | None:
        return self._documents.get(document_id)
