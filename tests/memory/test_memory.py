"""Memory subsystem tests (§R9.1/§R9.2/§R9.12): store isolation, few-shot source, immutability."""

from __future__ import annotations

import dataclasses
import uuid

import pytest

from app.content.budget import HeuristicTokenEstimator
from app.llm.fakes import FakeEmbeddingProvider
from app.memory.source import MemoryRetriever
from app.memory.stores import FakeMemoryStore
from app.memory.types import MemoryEntry, MemoryScope, StyleFeatures
from app.rag.assembly import ContextAssembler
from app.rag.embedding import ProviderEmbedder

CH = uuid.uuid4()
OTHER = uuid.uuid4()


def _embedder(dim: int = 32) -> ProviderEmbedder:
    return ProviderEmbedder(FakeEmbeddingProvider(dimension=dim))


def _entry(channel_id: uuid.UUID | None, text: str, vec: tuple[float, ...]) -> MemoryEntry:
    return MemoryEntry(uuid.uuid4(), channel_id, MemoryScope.content, "example", text, vec)


async def _store(*entries: MemoryEntry) -> FakeMemoryStore:
    store = FakeMemoryStore()
    await store.add(list(entries))
    return store


def _retriever(store: FakeMemoryStore, emb: ProviderEmbedder) -> MemoryRetriever:
    return MemoryRetriever(store, emb, ContextAssembler(HeuristicTokenEstimator(), kind="example"))


def test_memory_types_immutable() -> None:
    entry = _entry(CH, "t", (0.0,))
    field_name = "text"  # variable name avoids ruff B010 + mypy read-only-property error
    with pytest.raises(dataclasses.FrozenInstanceError):
        setattr(entry, field_name, "x")
    assert MemoryScope.global_.value == "global"
    assert StyleFeatures(channel_id=CH, features={"avg_len": 12.0}).features["avg_len"] == 12.0


async def test_memory_store_isolates_by_channel() -> None:
    emb = _embedder()
    vecs = await emb.embed_texts(["coffee", "tea"])
    store = await _store(_entry(CH, "coffee", vecs[0]), _entry(OTHER, "tea", vecs[1]))
    query = await emb.embed_query("coffee")
    results = await store.search(query, channel_id=CH, limit=5)
    assert [r.chunk.text for r in results] == ["coffee"]  # §R9.2


async def test_memory_source_returns_examples() -> None:
    emb = _embedder()
    (vec,) = await emb.embed_texts(["morning coffee ritual"])
    retriever = _retriever(await _store(_entry(CH, "morning coffee ritual", vec)), emb)
    items = await retriever.few_shot(channel_id=CH, topic="coffee", limit=3)
    assert [i.kind for i in items] == ["example"]
    assert items[0].text == "morning coffee ritual"


async def test_memory_source_without_topic_returns_empty() -> None:
    retriever = _retriever(FakeMemoryStore(), _embedder())
    assert await retriever.few_shot(channel_id=CH, topic=None, limit=3) == []
