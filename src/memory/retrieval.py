"""RAG retrieval — cosine-similarity search over knowledge_chunks (pgvector)."""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import KnowledgeChunk, KnowledgeDocument
from app.models.channel import channel_knowledge_bases

from .embeddings import Embedder


async def knowledge_base_ids_for_channel(session: AsyncSession, channel_id: int) -> list[int]:
    rows = await session.execute(
        select(channel_knowledge_bases.c.knowledge_base_id).where(
            channel_knowledge_bases.c.channel_id == channel_id
        )
    )
    return [row[0] for row in rows.all()]


async def retrieve(
    session: AsyncSession,
    *,
    query: str,
    knowledge_base_ids: Sequence[int],
    embedder: Embedder,
    top_k: int = 5,
) -> list[KnowledgeChunk]:
    """Return the top_k chunks (across the given knowledge bases) nearest to the
    query by cosine distance. Empty when there are no knowledge bases.
    """
    if not knowledge_base_ids:
        return []

    (query_vector,) = await embedder.embed([query])
    stmt = (
        select(KnowledgeChunk)
        .join(KnowledgeDocument, KnowledgeChunk.document_id == KnowledgeDocument.id)
        .where(
            KnowledgeDocument.knowledge_base_id.in_(knowledge_base_ids),
            KnowledgeChunk.embedding.is_not(None),
        )
        .order_by(KnowledgeChunk.embedding.cosine_distance(query_vector))
        .limit(top_k)
    )
    return list((await session.execute(stmt)).scalars().all())


async def retrieve_context_for_channel(
    session: AsyncSession,
    *,
    channel_id: int,
    query: str,
    embedder: Embedder,
    top_k: int = 5,
) -> str | None:
    """Convenience: resolve a channel's knowledge bases, retrieve, and join the
    chunk texts into a context block (or None if nothing is available).
    """
    kb_ids = await knowledge_base_ids_for_channel(session, channel_id)
    chunks = await retrieve(
        session, query=query, knowledge_base_ids=kb_ids, embedder=embedder, top_k=top_k
    )
    if not chunks:
        return None
    return "\n\n".join(chunk.content for chunk in chunks)
