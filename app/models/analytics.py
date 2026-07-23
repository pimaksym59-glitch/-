"""Analytics & ops models (§R4.8, §R11, §R12.9): analytics_snapshots, api_usage, image_usage,
errors, logs. Insert-only high-volume rows (``Record`` base). Engagement columns are NULLABLE —
unavailable on Bot API (§R7.3)."""

from __future__ import annotations

import datetime
import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, Numeric, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Record
from app.models.enums import SEVERITY_LEVEL, SeverityLevel


class AnalyticsSnapshot(Record):
    __tablename__ = "analytics_snapshots"

    post_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("posts.id"))
    channel_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("channels.id"))
    captured_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True))
    views: Mapped[int | None] = mapped_column(BigInteger)
    likes: Mapped[int | None] = mapped_column(BigInteger)
    comments: Mapped[int | None] = mapped_column(BigInteger)
    shares: Mapped[int | None] = mapped_column(BigInteger)
    ctr: Mapped[Decimal | None] = mapped_column(Numeric)
    er: Mapped[Decimal | None] = mapped_column(Numeric)
    subscriber_delta: Mapped[int | None]
    conversion: Mapped[Decimal | None] = mapped_column(Numeric)

    __table_args__ = (
        Index("ix_analytics_snapshots_post_id_captured_at", "post_id", "captured_at"),
    )


class ApiUsage(Record):
    __tablename__ = "api_usage"

    channel_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("channels.id"))
    model: Mapped[str | None] = mapped_column(Text)
    cost_usd: Mapped[Decimal | None] = mapped_column(Numeric)
    prompt_tokens: Mapped[int | None]
    completion_tokens: Mapped[int | None]
    latency_ms: Mapped[int | None]
    error: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (Index("ix_api_usage_channel_id_created_at", "channel_id", "created_at"),)


class ImageUsage(Record):
    __tablename__ = "image_usage"

    channel_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("channels.id"))
    provider: Mapped[str | None] = mapped_column(Text)
    cost_usd: Mapped[Decimal | None] = mapped_column(Numeric)
    latency_ms: Mapped[int | None]
    seed: Mapped[int | None] = mapped_column(BigInteger)
    prompt: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (Index("ix_image_usage_channel_id_created_at", "channel_id", "created_at"),)


class ErrorLog(Record):
    __tablename__ = "errors"

    module: Mapped[str | None] = mapped_column(Text)
    stack_trace: Mapped[str | None] = mapped_column(Text)
    severity: Mapped[SeverityLevel] = mapped_column(SEVERITY_LEVEL)
    resolved: Mapped[bool] = mapped_column(default=False, server_default="false")


class SystemLog(Record):
    __tablename__ = "logs"

    event: Mapped[str | None] = mapped_column(Text)
    channel_id: Mapped[uuid.UUID | None]
    task_id: Mapped[uuid.UUID | None]
    severity: Mapped[SeverityLevel | None] = mapped_column(SEVERITY_LEVEL)
    payload: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
