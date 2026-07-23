"""Memory model (§R9): RAG store — carrier of text embeddings (§R4.5). Channel-isolated (§R9.2)."""

from __future__ import annotations

import uuid
from decimal import Decimal

from pgvector.sqlalchemy import Vector
from sqlalchemy import ForeignKey, Index, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.types import TEXT_EMBEDDING_DIM
from app.models.base import Record
from app.models.enums import MEMORY_KIND, MemoryKind


class Memory(Record):
    __tablename__ = "memory"

    channel_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("channels.id"))
    text: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(TEXT_EMBEDDING_DIM))
    kind: Mapped[MemoryKind] = mapped_column(MEMORY_KIND)
    source: Mapped[str | None] = mapped_column(Text)
    weight: Mapped[Decimal] = mapped_column(Numeric, default=Decimal(1), server_default="1.0")

    __table_args__ = (
        Index("ix_memory_channel_id_kind_created_at", "channel_id", "kind", "created_at"),
        Index(
            "ix_memory_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )
