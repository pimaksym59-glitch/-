"""Retrieval (owner req 5, §R9.7/§R9.11) — finds candidates **only**, no ranking or assembly. A
``RetrievalStrategy`` embeds the query and asks the injected ``VectorStore`` for nearest candidates;
the pipeline is storage-agnostic. Semantic search is implemented; keyword/hybrid (vector+keyword,
RRF)
is an **extension point** (owner req 13) — add a strategy without changing the pipeline.
"""

from __future__ import annotations

from typing import Protocol

from app.rag.embedding import Embedder
from app.rag.stores import VectorStore
from app.rag.types import RetrievalQuery, SearchResult


class RetrievalStrategy(Protocol):
    async def retrieve(
        self, query: RetrievalQuery, *, store: VectorStore, embedder: Embedder
    ) -> list[SearchResult]: ...


class SemanticStrategy:
    """Dense vector search: embed the query, return the store's nearest candidates."""

    async def retrieve(
        self, query: RetrievalQuery, *, store: VectorStore, embedder: Embedder
    ) -> list[SearchResult]:
        vector = await embedder.embed_query(query.text)
        return await store.search(vector, query.filter, query.limit)


class RetrievalPipeline:
    """Binds a store + embedder + strategy. Returns candidates only (owner req 5)."""

    def __init__(
        self, store: VectorStore, embedder: Embedder, strategy: RetrievalStrategy | None = None
    ) -> None:
        self._store = store
        self._embedder = embedder
        self._strategy = strategy if strategy is not None else SemanticStrategy()

    async def retrieve(self, query: RetrievalQuery) -> list[SearchResult]:
        return await self._strategy.retrieve(query, store=self._store, embedder=self._embedder)
