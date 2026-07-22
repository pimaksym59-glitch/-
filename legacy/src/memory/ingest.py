"""Ingest a KnowledgeDocument into embedded chunks (pgvector).

Ingestion is a direct callable (used by the admin panel / scripts later), not a
queue task — adding a TaskType would require a Postgres enum migration, out of
scope for Stage 5.
"""

from __future__ import annotations

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import KnowledgeChunk, KnowledgeDocument

from .chunking import chunk_text
from .embeddings import Embedder


async def ingest_document(
    session: AsyncSession,
    document_id: int,
    embedder: Embedder,
    *,
    chunk_size: int = 800,
    overlap: int = 150,
) -> int:
    """(Re)chunk and embed a document. Returns the number of chunks written."""
    document = await session.get(KnowledgeDocument, document_id)
    if document is None or not document.raw_text:
        return 0

    # Idempotent re-ingest: drop existing chunks first.
    await session.execute(delete(KnowledgeChunk).where(KnowledgeChunk.document_id == document_id))

    chunks = chunk_text(document.raw_text, chunk_size=chunk_size, overlap=overlap)
    if not chunks:
        await session.commit()
        return 0

    vectors = await embedder.embed(chunks)
    for index, (content, vector) in enumerate(zip(chunks, vectors, strict=True)):
        session.add(
            KnowledgeChunk(
                document_id=document_id,
                chunk_index=index,
                content=content,
                embedding=vector,
            )
        )
    await session.commit()
    return len(chunks)
