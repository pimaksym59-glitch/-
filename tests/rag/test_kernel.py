"""RAG kernel tests (§R9): DTO immutability, similarity, embedding, chunking, filters, stores."""

from __future__ import annotations

import dataclasses
import uuid

import pytest

from app.llm.fakes import FakeEmbeddingProvider
from app.rag.chunking import SemanticBlockChunker
from app.rag.embedding import ProviderEmbedder
from app.rag.fakes import FakeVectorStore
from app.rag.filters import matches
from app.rag.similarity import CosineSimilarity
from app.rag.types import Chunk, Metadata, SearchFilter

CH = uuid.uuid4()
OTHER = uuid.uuid4()


def _embedder(dim: int = 32) -> ProviderEmbedder:
    return ProviderEmbedder(FakeEmbeddingProvider(dimension=dim))


# --- DTO immutability (req 11/12) ----------------------------------------------------------------


def _freeze_check(obj: object, field_name: str, value: object) -> None:
    # variable attr name: avoids ruff B010 rewrite and mypy read-only-property error while
    # still proving the frozen dataclass rejects mutation.
    with pytest.raises(dataclasses.FrozenInstanceError):
        setattr(obj, field_name, value)


def test_metadata_is_immutable() -> None:
    _freeze_check(Metadata(channel_id=CH), "active", False)


def test_chunk_is_frozen() -> None:
    _freeze_check(Chunk(uuid.uuid4(), uuid.uuid4(), 0, "t", Metadata()), "text", "x")


# --- similarity (req 10) -------------------------------------------------------------------------


def test_cosine_identical_orthogonal_zero() -> None:
    sim = CosineSimilarity()
    assert sim.score([1.0, 0.0], [1.0, 0.0]) == pytest.approx(1.0)
    assert sim.score([1.0, 0.0], [0.0, 1.0]) == pytest.approx(0.0)
    assert sim.score([0.0, 0.0], [1.0, 1.0]) == 0.0  # zero vector -> 0


def test_cosine_length_mismatch_raises() -> None:
    with pytest.raises(ValueError, match="length mismatch"):
        CosineSimilarity().score([1.0], [1.0, 2.0])


# --- embedding (req 3) ---------------------------------------------------------------------------


async def test_provider_embedder_is_deterministic() -> None:
    emb = _embedder()
    a = await emb.embed_query("coffee")
    b = await emb.embed_query("coffee")
    assert a == b and len(a) == 32 and emb.dimension == 32
    texts = await emb.embed_texts(["x", "y"])
    assert len(texts) == 2 and all(isinstance(v, tuple) for v in texts)


# --- chunking (req 4/5) --------------------------------------------------------------------------


def test_chunker_splits_paragraphs_and_is_deterministic() -> None:
    chunker = SemanticBlockChunker(target_tokens=10_000)
    doc_id = uuid.uuid4()
    text = "First paragraph.\n\nSecond paragraph."
    chunks = chunker.chunk(doc_id, text, Metadata(channel_id=CH))
    assert [c.text for c in chunks] == [
        "First paragraph.\n\nSecond paragraph."
    ]  # merged under budget
    again = chunker.chunk(doc_id, text, Metadata(channel_id=CH))
    assert [c.id for c in chunks] == [c.id for c in again]  # deterministic ids


def test_chunker_respects_target_size() -> None:
    chunker = SemanticBlockChunker(target_tokens=2)  # ~8 chars -> each paragraph its own chunk
    chunks = chunker.chunk(uuid.uuid4(), "aaaa bbbb.\n\ncccc dddd.", Metadata())
    assert len(chunks) >= 2
    assert [c.ordinal for c in chunks] == list(range(len(chunks)))


def test_chunker_empty_text() -> None:
    assert SemanticBlockChunker().chunk(uuid.uuid4(), "   ", Metadata()) == []


# --- filters: channel isolation (req; §R9.2) -----------------------------------------------------


def test_channel_hard_filter_isolates() -> None:
    f = SearchFilter(channel_id=CH)
    assert matches(Metadata(channel_id=CH), f)
    assert not matches(Metadata(channel_id=OTHER), f)  # other channel excluded
    assert matches(Metadata(channel_id=None), f)  # global included by default
    assert not matches(Metadata(channel_id=None), SearchFilter(channel_id=CH, include_global=False))


def test_filter_doc_type_and_active() -> None:
    assert not matches(
        Metadata(channel_id=CH, doc_type="a"), SearchFilter(channel_id=CH, doc_type="b")
    )
    assert not matches(Metadata(channel_id=CH, active=False), SearchFilter(channel_id=CH))


# --- vector store (req 1/2/13) -------------------------------------------------------------------


async def test_fake_vector_store_filters_and_ranks() -> None:
    emb = _embedder()
    store = FakeVectorStore()
    vecs = await emb.embed_texts(["coffee", "tea"])
    await store.upsert(
        [
            Chunk(uuid.uuid4(), uuid.uuid4(), 0, "coffee", Metadata(channel_id=CH), vecs[0]),
            Chunk(uuid.uuid4(), uuid.uuid4(), 0, "tea", Metadata(channel_id=OTHER), vecs[1]),
        ]
    )
    query = await emb.embed_query("coffee")
    results = await store.search(query, SearchFilter(channel_id=CH), limit=5)
    assert [r.chunk.text for r in results] == ["coffee"]  # other channel filtered out
    assert results[0].score == pytest.approx(1.0)  # identical embedding
