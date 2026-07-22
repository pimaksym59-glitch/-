"""Unit tests for Memory/RAG pure logic (chunking, fake embedder, prompt wiring)."""

import pytest

from ai_engine.client import FakeLLMClient
from ai_engine.pipeline import run_pipeline
from ai_engine.prompts import generate_prompt
from app.config import Settings
from memory.chunking import chunk_text
from memory.embeddings import FakeEmbedder, get_embedder


# ── chunking ─────────────────────────────────────────────────────────────
def test_chunk_empty_text():
    assert chunk_text("") == []
    assert chunk_text("   ") == []


def test_chunk_short_text_single_chunk():
    assert chunk_text("hello world", chunk_size=800) == ["hello world"]


def test_chunk_splits_and_covers_all_words():
    text = " ".join(f"word{i}" for i in range(200))
    chunks = chunk_text(text, chunk_size=100, overlap=20)
    assert len(chunks) > 1
    # every original word appears somewhere
    joined = " ".join(chunks)
    for i in range(200):
        assert f"word{i}" in joined
    # chunks respect the size bound (allowing one word of slack)
    assert all(len(c) <= 100 + 20 for c in chunks)


def test_chunk_rejects_bad_overlap():
    with pytest.raises(ValueError):
        chunk_text("a b c", chunk_size=10, overlap=10)


# ── embeddings ───────────────────────────────────────────────────────────
async def test_fake_embedder_deterministic_and_dimensioned():
    emb = FakeEmbedder(dim=1536)
    [v1] = await emb.embed(["hello"])
    [v2] = await emb.embed(["hello"])
    [v3] = await emb.embed(["different"])
    assert len(v1) == 1536
    assert v1 == v2  # deterministic
    assert v1 != v3  # sensitive to input
    # unit-normalized
    assert abs(sum(x * x for x in v1) - 1.0) < 1e-6


async def test_fake_embedder_empty():
    assert await FakeEmbedder(dim=8).embed([]) == []


def test_get_embedder_falls_back_to_fake_without_key():
    emb = get_embedder(Settings(embedding_provider="openai", embedding_api_key=None))
    assert isinstance(emb, FakeEmbedder)
    assert emb.dim == 1536


# ── RAG wiring into the pipeline ─────────────────────────────────────────
def test_generate_prompt_includes_context():
    prompt = generate_prompt(channel_title="X", topic="cats", context="Cats purr.")
    assert "Cats purr." in prompt
    assert "background knowledge" in prompt


def test_generate_prompt_omits_context_block_when_none():
    prompt = generate_prompt(channel_title="X", topic="cats", context=None)
    assert "background knowledge" not in prompt


async def test_pipeline_passes_context_to_generate_stage():
    llm = FakeLLMClient()
    await run_pipeline(
        llm,
        channel_title="X",
        persona_system=None,
        tone=None,
        language="en",
        topic="cats",
        context="Secret fact 42.",
    )
    # first call is the generate stage; context must be present in its user prompt
    _, first_user = llm.calls[0]
    assert "Secret fact 42." in first_user
