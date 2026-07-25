"""Store abstractions (owner req 1/2, §R9) — **Protocol only, no ABC, no concrete backend**. The
retrieval kernel talks to storage exclusively through these interfaces, so pgvector/FAISS/Qdrant (or
an in-memory fake) plug in without touching the kernel. Real backends are Runtime Verification
Pending
(RV-12).
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from typing import Protocol

from app.rag.types import Chunk, Document, SearchFilter, SearchResult


class VectorStore(Protocol):
    """Vector index over chunks. ``search`` applies the hard filter and returns nearest
    candidates."""

    async def upsert(self, chunks: Sequence[Chunk]) -> None: ...

    async def search(
        self, query_vector: Sequence[float], search_filter: SearchFilter, limit: int
    ) -> list[SearchResult]: ...


class DocumentStore(Protocol):
    async def put(self, document: Document) -> None: ...

    async def get(self, document_id: uuid.UUID) -> Document | None: ...


class ChunkStore(Protocol):
    async def by_document(self, document_id: uuid.UUID) -> list[Chunk]: ...
