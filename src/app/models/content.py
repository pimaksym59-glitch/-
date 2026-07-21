"""Posts — the unit of generated content flowing through the pipeline."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, pg_enum
from .enums import PostStatus

if TYPE_CHECKING:
    from .analytics import PostMetric
    from .channel import Channel


class Post(Base, TimestampMixin):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    channel_id: Mapped[int] = mapped_column(
        ForeignKey("channels.id", ondelete="CASCADE"), nullable=False, index=True
    )
    persona_id: Mapped[int | None] = mapped_column(ForeignKey("personas.id", ondelete="SET NULL"))

    title: Mapped[str | None] = mapped_column(String(500))
    body: Mapped[str | None] = mapped_column(Text)
    image_path: Mapped[str | None] = mapped_column(String(1000))
    image_prompt: Mapped[str | None] = mapped_column(Text)

    status: Mapped[PostStatus] = mapped_column(
        pg_enum(PostStatus, "poststatus"),
        nullable=False,
        server_default=PostStatus.draft.value,
        index=True,
    )
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    telegram_message_id: Mapped[int | None] = mapped_column(BigInteger)
    error: Mapped[str | None] = mapped_column(Text)
    meta: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'"))

    channel: Mapped[Channel] = relationship(back_populates="posts")
    metrics: Mapped[list[PostMetric]] = relationship(
        back_populates="post", cascade="all, delete-orphan"
    )
