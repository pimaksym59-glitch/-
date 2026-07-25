"""RAG composition tests (§R9, §R2.10): sources built offline; AI Engine wired with real RAG."""

from __future__ import annotations

import uuid

import pytest

from app.content.types import GenerationRequest, PromptSpec, Role
from app.core.config import Settings
from app.llm.fakes import FakeEmbeddingProvider
from app.memory.stores import FakeMemoryStore
from app.memory.types import MemoryEntry, MemoryScope
from app.models.enums import PromptType
from app.rag.embedding import ProviderEmbedder
from app.rag.fakes import FakeVectorStore
from app.rag.types import Document, Metadata
from app.services.rag import (
    build_ai_engine_with_rag,
    build_knowledge_source,
    build_memory_source,
    ingest,
)


@pytest.fixture(autouse=True)
def _no_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    for var in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "TELEGRAM_BOT_TOKEN"):
        monkeypatch.delenv(var, raising=False)


def _embedder(dim: int = 32) -> ProviderEmbedder:
    return ProviderEmbedder(FakeEmbeddingProvider(dimension=dim))


async def test_build_knowledge_source_offline() -> None:
    emb, store = _embedder(), FakeVectorStore()
    ch = uuid.uuid4()
    await ingest(
        Document(uuid.uuid4(), "Coffee brewing guide.", Metadata(channel_id=ch, doc_type="guide")),
        settings=Settings(),
        vector_store=store,
        embedder=emb,
    )
    source = build_knowledge_source(Settings(), embedder=emb, vector_store=store)
    items = await source.relevant(channel_id=ch, query="coffee", limit=3)
    assert items and items[0].kind == "knowledge"


async def test_build_memory_source_offline() -> None:
    emb, store = _embedder(), FakeMemoryStore()
    ch = uuid.uuid4()
    (vec,) = await emb.embed_texts(["coffee ritual"])
    await store.add(
        [MemoryEntry(uuid.uuid4(), ch, MemoryScope.content, "example", "coffee ritual", vec)]
    )
    source = build_memory_source(Settings(), embedder=emb, memory_store=store)
    items = await source.few_shot(channel_id=ch, topic="coffee", limit=3)
    assert items and items[0].kind == "example"


async def test_ai_engine_with_rag_generates_offline() -> None:
    engine = build_ai_engine_with_rag(Settings(), embedder=_embedder())
    spec = PromptSpec(prompt_type=PromptType.story, role=Role.body, task="write", topic="coffee")
    result = await engine.generate(GenerationRequest(spec=spec, channel_id=uuid.uuid4()))
    assert result.passed and result.provider == "fake"  # engine unchanged; RAG sources plugged in
