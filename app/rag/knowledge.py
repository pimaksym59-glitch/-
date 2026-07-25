"""Knowledge Base subsystem (§R9.3/§R9.4/§R9.7/§R9.10). Ingestion is a **direct call, not a task**
(§R9.4): chunk -> embed (via the Stage-11 provider) -> index -> store. ``KnowledgeRetriever``
implements the Stage-12 ``KnowledgeContextSource`` port using the neutral retrieval kernel. Does
**not**
import Memory (owner req 9). No business logic — mechanisms only.
"""

from __future__ import annotations

import time
import uuid
from dataclasses import replace

from app.content.sources import ContextItem
from app.rag.assembly import ContextAssembler
from app.rag.chunking import Chunker
from app.rag.embedding import Embedder
from app.rag.observability import RagObservability
from app.rag.ranking import Ranker, ScoreRanker
from app.rag.retrieval import RetrievalPipeline
from app.rag.stores import DocumentStore, VectorStore
from app.rag.types import Chunk, Document, RetrievalQuery, SearchFilter


async def ingest_document(
    document: Document,
    *,
    chunker: Chunker,
    embedder: Embedder,
    vector_store: VectorStore,
    document_store: DocumentStore,
) -> list[Chunk]:
    """Ingest one document (§R9.4): chunk -> embed -> index -> persist. Returns the embedded
    chunks."""
    chunks = chunker.chunk(document.id, document.text, document.metadata)
    vectors = await embedder.embed_texts([chunk.text for chunk in chunks])
    embedded = [
        replace(chunk, embedding=vector) for chunk, vector in zip(chunks, vectors, strict=True)
    ]
    await vector_store.upsert(embedded)
    await document_store.put(document)
    return embedded


class KnowledgeRetriever:
    """Implements the Stage-12 ``KnowledgeContextSource`` port (§R9.3)."""

    def __init__(
        self,
        pipeline: RetrievalPipeline,
        assembler: ContextAssembler,
        *,
        ranker: Ranker | None = None,
        budget: int = 8000,
        observability: RagObservability | None = None,
    ) -> None:
        self._pipeline = pipeline
        self._assembler = assembler
        self._ranker = ranker if ranker is not None else ScoreRanker()
        self._budget = budget
        self._obs = observability if observability is not None else RagObservability()

    async def relevant(
        self, *, channel_id: uuid.UUID | None, query: str, limit: int
    ) -> list[ContextItem]:
        search_filter = SearchFilter(channel_id=channel_id, include_global=True, active_only=True)
        started = time.perf_counter()
        results = self._ranker.rank(
            await self._pipeline.retrieve(
                RetrievalQuery(text=query, filter=search_filter, limit=max(limit, 1))
            )
        )
        items = self._assembler.assemble(results, budget=self._budget, limit=limit)
        self._obs.metrics.incr("rag.knowledge.query")
        self._obs.logger.event(
            "rag.knowledge",
            found=len(results),
            used=len(items),
            search_ms=round((time.perf_counter() - started) * 1000, 2),
        )
        return items
