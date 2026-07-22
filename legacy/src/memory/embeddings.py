"""Embedding provider abstraction.

`OpenAIEmbedder` calls the embeddings API; `FakeEmbedder` is a deterministic
offline stand-in (hash-derived unit vectors) used in tests and when no key is
set. `get_embedder(settings)` selects between them.
"""

from __future__ import annotations

import hashlib
import math
from typing import Protocol, runtime_checkable

from app.config import Settings


@runtime_checkable
class Embedder(Protocol):
    @property
    def dim(self) -> int: ...

    async def embed(self, texts: list[str]) -> list[list[float]]: ...


class OpenAIEmbedder:
    def __init__(self, settings: Settings) -> None:
        from openai import AsyncOpenAI  # lazy: keep import light for tests/offline

        self._client = AsyncOpenAI(api_key=settings.embedding_api_key)
        self._model = settings.embedding_model
        self._dim = settings.embedding_dim

    @property
    def dim(self) -> int:
        return self._dim

    async def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        resp = await self._client.embeddings.create(model=self._model, input=texts)
        return [item.embedding for item in resp.data]


class FakeEmbedder:
    """Deterministic unit vectors derived from a hash of the text. Same text →
    same vector, so similarity search is meaningful and reproducible offline.
    """

    def __init__(self, dim: int) -> None:
        self._dim = dim

    @property
    def dim(self) -> int:
        return self._dim

    async def embed(self, texts: list[str]) -> list[list[float]]:
        return [self._vector(text) for text in texts]

    def _vector(self, text: str) -> list[float]:
        vals: list[float] = []
        counter = 0
        seed = hashlib.sha256(text.encode("utf-8")).digest()
        while len(vals) < self._dim:
            block = hashlib.sha256(seed + counter.to_bytes(4, "big")).digest()
            for i in range(0, len(block), 4):
                if len(vals) >= self._dim:
                    break
                vals.append(int.from_bytes(block[i : i + 4], "big") / 2**32 - 0.5)
            counter += 1
        norm = math.sqrt(sum(v * v for v in vals)) or 1.0
        return [v / norm for v in vals]


def get_embedder(settings: Settings) -> Embedder:
    """Real embedder when configured with a key, otherwise the deterministic fake."""
    if settings.embedding_provider == "openai" and settings.embedding_api_key:
        return OpenAIEmbedder(settings)
    return FakeEmbedder(settings.embedding_dim)
