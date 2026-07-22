"""Integration: ingest a document and retrieve it back via pgvector.

Skipped unless RUN_INTEGRATION=1 with Postgres (pgvector) migrated and running.
"""

import os

import pytest

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_INTEGRATION") != "1",
    reason="set RUN_INTEGRATION=1 with a migrated pgvector Postgres running",
)


async def test_ingest_then_retrieve():
    from app.db import get_sessionmaker
    from app.models import KnowledgeBase, KnowledgeDocument
    from memory.embeddings import FakeEmbedder
    from memory.ingest import ingest_document
    from memory.retrieval import retrieve

    embedder = FakeEmbedder(dim=1536)
    sm = get_sessionmaker()
    async with sm() as session:
        kb = KnowledgeBase(name="test-kb")
        session.add(kb)
        await session.flush()
        doc = KnowledgeDocument(
            knowledge_base_id=kb.id,
            title="doc",
            raw_text="The capital of France is Paris. " * 50,
        )
        session.add(doc)
        await session.commit()
        doc_id, kb_id = doc.id, kb.id

    async with sm() as session:
        written = await ingest_document(session, doc_id, embedder)
        assert written > 0

    async with sm() as session:
        chunks = await retrieve(
            session,
            query="What is the capital of France?",
            knowledge_base_ids=[kb_id],
            embedder=embedder,
            top_k=3,
        )
        assert chunks
        assert "Paris" in chunks[0].content
