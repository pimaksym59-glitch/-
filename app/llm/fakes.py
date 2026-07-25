"""Deterministic, offline LLM + Embedding fakes (§R2.10, owner req 11). No randomness: outputs are a
pure function of the input, so tests are reproducible. No business logic — just protocol-conformant
stand-ins that let the whole system run offline.
"""

from __future__ import annotations

import hashlib
import math
from collections.abc import Sequence

from app.core.providers.base import Capability, ProviderKind
from app.core.providers.health import ProviderHealth
from app.core.providers.registry import FAKE_NAME
from app.llm.base import LLMResult

DEFAULT_EMBEDDING_DIM = 1536  # platform text-embedding size (§R4.6)


class FakeLLMProvider:
    """Deterministic templated text derived from the prompt. Records prompts for assertions."""

    name = FAKE_NAME
    kind = ProviderKind.llm

    def __init__(self) -> None:
        self.prompts: list[str] = []

    def capabilities(self) -> frozenset[Capability]:
        return frozenset({Capability.text_generation, Capability.json_mode})

    async def health(self) -> ProviderHealth:
        return ProviderHealth(healthy=True)

    async def generate(
        self, prompt: str, *, model: str | None = None, json_mode: bool = False
    ) -> LLMResult:
        self.prompts.append(prompt)
        resolved = model or "fake-llm"
        digest = hashlib.sha256(prompt.encode("utf-8")).hexdigest()[:8]
        text = f'{{"fake": "{digest}"}}' if json_mode else f"[fake:{resolved}] {digest}"
        return LLMResult(
            text=text,
            model=resolved,
            prompt_tokens=len(prompt.split()),
            completion_tokens=len(text.split()),
        )


class FakeEmbeddingProvider:
    """Returns deterministic unit vectors of ``dimension`` derived from each input text."""

    name = FAKE_NAME
    kind = ProviderKind.embedding

    def __init__(self, dimension: int = DEFAULT_EMBEDDING_DIM) -> None:
        self.dimension = dimension

    def capabilities(self) -> frozenset[Capability]:
        return frozenset({Capability.embeddings})

    async def health(self) -> ProviderHealth:
        return ProviderHealth(healthy=True)

    async def embed(self, texts: Sequence[str]) -> list[list[float]]:
        return [self._vector(text) for text in texts]

    def _vector(self, text: str) -> list[float]:
        raw = text.encode("utf-8")
        values: list[float] = []
        counter = 0
        while len(values) < self.dimension:
            block = hashlib.sha256(raw + counter.to_bytes(4, "big")).digest()
            values.extend(byte / 255.0 for byte in block)
            counter += 1
        vector = values[: self.dimension]
        norm = math.sqrt(sum(value * value for value in vector)) or 1.0
        return [value / norm for value in vector]
