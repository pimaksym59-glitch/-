"""Image models: images, image_history (§R6). CLIP embedding + phash + HNSW (§R4.5/R4.14)."""

from __future__ import annotations

import datetime
import uuid
from decimal import Decimal

from pgvector.sqlalchemy import Vector
from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.types import IMAGE_EMBEDDING_DIM
from app.models.base import Entity, Record


class Image(Entity):
    __tablename__ = "images"

    channel_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("channels.id"))
    actor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("actors.id"))
    location_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("locations.id"))
    prompt: Mapped[str | None] = mapped_column(Text)
    negative_prompt: Mapped[str | None] = mapped_column(Text)
    provider: Mapped[str | None] = mapped_column(Text)
    seed: Mapped[int | None] = mapped_column(BigInteger)
    resolution: Mapped[str | None] = mapped_column(Text)
    style: Mapped[str | None] = mapped_column(Text)
    camera: Mapped[str | None] = mapped_column(Text)
    lighting: Mapped[str | None] = mapped_column(Text)
    composition: Mapped[str | None] = mapped_column(Text)
    storage_path: Mapped[str | None] = mapped_column(Text)
    phash: Mapped[str | None] = mapped_column(Text)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(IMAGE_EMBEDDING_DIM))
    quality_score: Mapped[Decimal | None] = mapped_column(Numeric)
    status: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        Index("ix_images_channel_id_published_at", "channel_id", "published_at"),
        Index("ix_images_phash", "phash"),
        Index(
            "ix_images_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )


class ImageHistory(Record):
    __tablename__ = "image_history"

    image_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("images.id"))
    attempt: Mapped[int | None]
    prompt: Mapped[str | None] = mapped_column(Text)
    seed: Mapped[int | None] = mapped_column(BigInteger)
    provider: Mapped[str | None] = mapped_column(Text)
    result: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (Index("ix_image_history_image_id", "image_id"),)
