"""Content-cluster models: posts, post_history, topics, cta, prompts, schedules (§R4, §R5, §R7)."""

from __future__ import annotations

import datetime
import uuid
from decimal import Decimal

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, Numeric, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Entity, Record
from app.models.enums import (
    POST_STATUS,
    PROMPT_TYPE,
    TASK_TYPE,
    PostStatus,
    PromptType,
    TaskType,
)


class Topic(Entity):
    __tablename__ = "topics"

    channel_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("channels.id"))
    name: Mapped[str] = mapped_column(Text)
    popularity: Mapped[Decimal | None] = mapped_column(Numeric)
    frequency: Mapped[int | None]
    last_used_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True))
    success_rate: Mapped[Decimal | None] = mapped_column(Numeric)

    __table_args__ = (Index("ix_topics_channel_id", "channel_id"),)


class Cta(Entity):
    __tablename__ = "cta"

    channel_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("channels.id"))
    type: Mapped[str] = mapped_column(Text)
    conversion: Mapped[Decimal | None] = mapped_column(Numeric)
    usage_count: Mapped[int] = mapped_column(default=0, server_default="0")
    success_rate: Mapped[Decimal | None] = mapped_column(Numeric)

    __table_args__ = (Index("ix_cta_channel_id", "channel_id"),)


class Post(Entity):
    __tablename__ = "posts"

    channel_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("channels.id"))
    persona_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("personas.id"))
    title: Mapped[str | None] = mapped_column(Text)
    body: Mapped[str | None] = mapped_column(Text)
    language: Mapped[str | None] = mapped_column(Text)
    topic_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("topics.id"))
    emotion: Mapped[str | None] = mapped_column(Text)
    cta_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("cta.id"))
    status: Mapped[PostStatus] = mapped_column(POST_STATUS, default=PostStatus.draft)
    quality_score: Mapped[Decimal | None] = mapped_column(Numeric)
    readability_score: Mapped[Decimal | None] = mapped_column(Numeric)
    duplicate_score: Mapped[Decimal | None] = mapped_column(Numeric)
    memory_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("memory.id"))
    image_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("images.id"))
    telegram_message_id: Mapped[int | None] = mapped_column(BigInteger)
    scheduled_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True))
    published_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        Index("ix_posts_channel_id_status", "channel_id", "status"),
        Index("ix_posts_channel_id_published_at", "channel_id", text("published_at DESC")),
        Index("ix_posts_topic_id", "topic_id"),
        Index(
            "ix_posts_body_fts",
            text("to_tsvector('simple', coalesce(body, ''))"),
            postgresql_using="gin",
        ),
    )


class PostHistory(Record):
    __tablename__ = "post_history"

    post_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("posts.id"))
    version_no: Mapped[int]
    body: Mapped[str | None] = mapped_column(Text)
    changed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    change_reason: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (Index("ix_post_history_post_id", "post_id"),)


class Prompt(Record):
    __tablename__ = "prompts"

    type: Mapped[PromptType] = mapped_column(PROMPT_TYPE)
    text: Mapped[str] = mapped_column(Text)
    version: Mapped[int] = mapped_column(default=1, server_default="1")
    author: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    model: Mapped[str | None] = mapped_column(Text)
    result: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (Index("ix_prompts_type", "type"),)


class Schedule(Entity):
    __tablename__ = "schedules"

    channel_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("channels.id"))
    cron: Mapped[str | None] = mapped_column(Text)
    day_of_week: Mapped[int | None]
    time_local: Mapped[datetime.time | None]
    timezone: Mapped[str | None] = mapped_column(Text)
    slot_name: Mapped[str | None] = mapped_column(Text)
    task_type: Mapped[TaskType | None] = mapped_column(TASK_TYPE)
    enabled: Mapped[bool] = mapped_column(default=True, server_default=text("true"))

    __table_args__ = (Index("ix_schedules_channel_id", "channel_id"),)
