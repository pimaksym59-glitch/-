"""Task queue model (§R4.9, §R8): the pipeline backbone (Postgres + FOR UPDATE SKIP LOCKED)."""

from __future__ import annotations

import datetime
import uuid
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Entity
from app.models.enums import TASK_STATUS, TASK_TYPE, TaskStatus, TaskType


class Task(Entity):
    __tablename__ = "tasks"

    channel_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("channels.id"))
    type: Mapped[TaskType] = mapped_column(TASK_TYPE)
    status: Mapped[TaskStatus] = mapped_column(TASK_STATUS, default=TaskStatus.pending)
    priority: Mapped[int] = mapped_column(default=100, server_default="100")
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, server_default="{}")
    attempts: Mapped[int] = mapped_column(default=0, server_default="0")
    run_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    locked_by: Mapped[str | None] = mapped_column(Text)
    locked_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True))
    dedup_key: Mapped[str | None] = mapped_column(Text)
    slot_datetime: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True))
    schedule_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("schedules.id"))
    last_error: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (
        Index(
            "ix_tasks_pending_dispatch",
            "status",
            "run_at",
            "priority",
            postgresql_where=text("status = 'pending'"),
        ),
        Index(
            "uq_tasks_dedup_key",
            "dedup_key",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
        Index(
            "uq_tasks_channel_schedule_slot",
            "channel_id",
            "schedule_id",
            "slot_datetime",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
    )
