"""Embedding integration (§R2.10/§R4.6/§R9.6, owner req 3). Embeddings are produced **only** through
the Stage-11 ``EmbeddingProvider`` protocol — no direct model calls. The kernel depends on the small
``Embedder`` interface; ``ProviderEmbedder`` adapts an ``EmbeddingProvider`` to it. Real embedding
calls happen only when a real provider is configured (§R2.10); otherwise the fake is used offline.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

from app.llm.base import EmbeddingProvider


class Embedder(Protocol):
    dimension: int

    async def embed_query(self, text: str) -> tuple[float, ...]: ...

    async def embed_texts(self, texts: Sequence[str]) -> list[tuple[float, ...]]: ...


class ProviderEmbedder:
    """Adapts a Stage-11 ``EmbeddingProvider`` to the kernel's ``Embedder`` interface."""

    def __init__(self, provider: EmbeddingProvider) -> None:
        self._provider = provider
        self.dimension = provider.dimension

    async def embed_query(self, text: str) -> tuple[float, ...]:
        vectors = await self._provider.embed([text])
        return tuple(vectors[0])

    async def embed_texts(self, texts: Sequence[str]) -> list[tuple[float, ...]]:
        vectors = await self._provider.embed(list(texts))
        return [tuple(vector) for vector in vectors]
