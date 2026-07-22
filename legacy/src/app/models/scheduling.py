"""Schedules (when a channel publishes) and Tasks (the queue unit of work).

A Task may depend on another Task (`depends_on_id`); the Scheduler in Stage 3
uses status + available_at + dependency to decide what becomes runnable.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, pg_enum
from .enums import TaskStatus, TaskType

if TYPE_CHECKING:
    from .channel import Channel


class Schedule(Base, TimestampMixin):
    __tablename__ = "schedules"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    channel_id: Mapped[int] = mapped_column(
        ForeignKey("channels.id", ondelete="CASCADE"), nullable=False, index=True
    )
    cron: Mapped[str | None] = mapped_column(String(100))
    interval_seconds: Mapped[int | None] = mapped_column(Integer)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, server_default="UTC")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    next_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    channel: Mapped[Channel] = relationship(back_populates="schedules")


class Task(Base, TimestampMixin):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    type: Mapped[TaskType] = mapped_column(pg_enum(TaskType, "tasktype"), nullable=False)
    status: Mapped[TaskStatus] = mapped_column(
        pg_enum(TaskStatus, "taskstatus"),
        nullable=False,
        server_default=TaskStatus.pending.value,
        index=True,
    )
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'"))
    priority: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    max_attempts: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("3"))
    available_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    depends_on_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id", ondelete="SET NULL"))
    result: Mapped[dict | None] = mapped_column(JSONB)
    error: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    depends_on: Mapped[Task | None] = relationship(remote_side=[id])
