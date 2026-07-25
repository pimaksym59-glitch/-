"""LLM + Embedding provider protocols (§R5, §R2.10). Ports only — no SDK, no HTTP, no DB. Real
adapters (Anthropic/OpenAI) and the fakes implement these; they extend the generic ``Provider``
contract (health/capabilities) from ``app.core.providers``.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol

from app.core.providers.base import Provider


@dataclass(frozen=True, slots=True)
class LLMResult:
    text: str
    model: str
    prompt_tokens: int
    completion_tokens: int


class LLMProvider(Provider, Protocol):
    """Text generation (§R5). ``model`` selects a routed model (§R2); None = provider default."""

    async def generate(
        self, prompt: str, *, model: str | None = None, json_mode: bool = False
    ) -> LLMResult: ...


class EmbeddingProvider(Provider, Protocol):
    """Text embeddings (§R4.6). ``dimension`` is the platform vector size."""

    dimension: int

    async def embed(self, texts: Sequence[str]) -> list[list[float]]: ...
