"""Retrieval / ranking / assembly / knowledge tests (§R9.4/R9.7/R9.8) — separation of concerns."""

from __future__ import annotations

import uuid

from app.content.budget import HeuristicTokenEstimator
from app.llm.fakes import FakeEmbeddingProvider
from app.rag.assembly import ContextAssembler
from app.rag.cache import NoOpCache
from app.rag.chunking import SemanticBlockChunker
from app.rag.embedding import ProviderEmbedder
from app.rag.fakes import FakeDocumentStore, FakeVectorStore
from app.rag.knowledge import KnowledgeRetriever, ingest_document
from app.rag.ranking import ScoreRanker
from app.rag.retrieval import RetrievalPipeline
from app.rag.types import (
    Chunk,
    Document,
    Metadata,
    RetrievalQuery,
    SearchFilter,
    SearchResult,
)

CH = uuid.uuid4()


def _embedder(dim: int = 32) -> ProviderEmbedder:
    return ProviderEmbedder(FakeEmbeddingProvider(dimension=dim))


def _result(text: str, score: float) -> SearchResult:
    chunk = Chunk(uuid.uuid4(), uuid.uuid4(), 0, text, Metadata(channel_id=CH))
    return SearchResult(chunk=chunk, score=score)


# --- ranking: sorts candidates, no re-retrieval (req 6) ------------------------------------------


def test_score_ranker_sorts_descending_stable() -> None:
    ranked = ScoreRanker().rank([_result("a", 0.1), _result("b", 0.9), _result("c", 0.5)])
    assert [r.chunk.text for r in ranked] == ["b", "c", "a"]


# --- assembly: works only on results, budget + limit (req 7) -------------------------------------


def test_assembler_respects_limit_and_budget() -> None:
    assembler = ContextAssembler(HeuristicTokenEstimator(), kind="knowledge")
    results = [_result("x" * 40, 0.9), _result("y" * 40, 0.8)]  # 10 tokens each
    items = assembler.assemble(results, budget=1000, limit=1)
    assert len(items) == 1 and items[0].kind == "knowledge"
    assert assembler.assemble(results, budget=5, limit=5) == []  # nothing fits budget


# --- retrieval: candidates only, storage-agnostic (req 2/5) --------------------------------------


async def test_retrieval_pipeline_returns_candidates() -> None:
    emb = _embedder()
    store = FakeVectorStore()
    vecs = await emb.embed_texts(["coffee"])
    await store.upsert(
        [Chunk(uuid.uuid4(), uuid.uuid4(), 0, "coffee", Metadata(channel_id=CH), vecs[0])]
    )
    pipeline = RetrievalPipeline(store, emb)
    query = RetrievalQuery(text="coffee", filter=SearchFilter(channel_id=CH), limit=5)
    results = await pipeline.retrieve(query)
    assert [r.chunk.text for r in results] == ["coffee"]


async def test_noop_cache_misses() -> None:
    cache = NoOpCache()
    assert await cache.get("k") is None
    await cache.put("k", [])  # must not raise


# --- knowledge: ingestion + retriever (§R9.4) ----------------------------------------------------


async def test_ingest_document_chunks_embeds_indexes() -> None:
    emb = _embedder()
    vector_store, doc_store = FakeVectorStore(), FakeDocumentStore()
    doc = Document(
        uuid.uuid4(), "Para one.\n\nPara two.", Metadata(channel_id=CH, doc_type="guide")
    )
    chunks = await ingest_document(
        doc,
        chunker=SemanticBlockChunker(target_tokens=10_000),
        embedder=emb,
        vector_store=vector_store,
        document_store=doc_store,
    )
    assert chunks and all(c.embedding is not None for c in chunks)
    assert await doc_store.get(doc.id) == doc


async def test_knowledge_retriever_returns_isolated_items() -> None:
    emb = _embedder()
    store = FakeVectorStore()
    other = uuid.uuid4()
    for cid, text in ((CH, "coffee guide"), (other, "tea guide")):
        (vec,) = await emb.embed_texts([text])
        await store.upsert(
            [Chunk(uuid.uuid4(), uuid.uuid4(), 0, text, Metadata(channel_id=cid), vec)]
        )
    retriever = KnowledgeRetriever(
        RetrievalPipeline(store, emb),
        ContextAssembler(HeuristicTokenEstimator(), kind="knowledge"),
    )
    items = await retriever.relevant(channel_id=CH, query="coffee", limit=3)
    assert [i.text for i in items] == ["coffee guide"]  # §R9.2 isolation
    assert all(i.kind == "knowledge" for i in items)


def test_query_defaults() -> None:
    query = RetrievalQuery(text="q", filter=SearchFilter())
    assert query.limit == 5  # sanity default
