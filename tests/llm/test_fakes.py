"""LLM/Embedding fake tests (§R2.10, owner req 4/11): Protocol-conformant, deterministic."""

from __future__ import annotations

import math

from app.core.providers.base import Capability, ProviderKind
from app.llm.base import EmbeddingProvider, LLMProvider
from app.llm.fakes import DEFAULT_EMBEDDING_DIM, FakeEmbeddingProvider, FakeLLMProvider


def test_fake_llm_conforms_to_protocol() -> None:
    provider: LLMProvider = FakeLLMProvider()  # static structural conformance (mypy)
    assert provider.kind is ProviderKind.llm
    assert Capability.text_generation in provider.capabilities()


async def test_fake_llm_is_deterministic() -> None:
    a = await FakeLLMProvider().generate("hello")
    b = await FakeLLMProvider().generate("hello")
    assert a == b
    assert (await FakeLLMProvider().generate("other")) != a


async def test_fake_llm_json_mode_and_recording() -> None:
    provider = FakeLLMProvider()
    result = await provider.generate("prompt", json_mode=True)
    assert result.text.startswith("{") and result.text.endswith("}")
    assert provider.prompts == ["prompt"]


async def test_fake_llm_health_ok() -> None:
    assert (await FakeLLMProvider().health()).healthy is True


def test_fake_embedding_conforms_to_protocol() -> None:
    provider: EmbeddingProvider = FakeEmbeddingProvider()
    assert provider.dimension == DEFAULT_EMBEDDING_DIM
    assert Capability.embeddings in provider.capabilities()


async def test_fake_embedding_deterministic_unit_vectors() -> None:
    provider = FakeEmbeddingProvider(dimension=64)
    first = await provider.embed(["a", "b"])
    second = await provider.embed(["a", "b"])
    assert first == second  # deterministic
    assert len(first) == 2 and all(len(vec) == 64 for vec in first)
    assert math.isclose(math.sqrt(sum(v * v for v in first[0])), 1.0, rel_tol=1e-9)
    assert first[0] != first[1]  # different inputs -> different vectors
