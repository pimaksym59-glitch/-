"""Knowledge Base models (§R9.3): documents + document_chunks. Separate from Content Memory."""

from __future__ import annotations

import uuid
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.types import TEXT_EMBEDDING_DIM
from app.models.base import Entity, Record


class Document(Entity):
    __tablename__ = "documents"

    source: Mapped[str | None] = mapped_column(Text)
    author: Mapped[str | None] = mapped_column(Text)
    doc_type: Mapped[str | None] = mapped_column(Text)
    language: Mapped[str | None] = mapped_column(Text)
    channel_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("channels.id"))
    persona_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("personas.id"))
    active_version: Mapped[int | None]
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(Text))

    __table_args__ = (Index("ix_documents_channel_id", "channel_id"),)


class DocumentChunk(Record):
    __tablename__ = "document_chunks"

    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("documents.id"))
    version: Mapped[int]
    chunk_index: Mapped[int]
    text: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(TEXT_EMBEDDING_DIM))
    chunk_metadata: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSONB)

    __table_args__ = (
        Index("ix_document_chunks_document_id_version", "document_id", "version"),
        Index(
            "ix_document_chunks_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )
