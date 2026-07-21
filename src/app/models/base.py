"""Declarative base and shared mixins for all ORM models.

All domain models register on this single `Base.metadata`, which is the target
for Alembic autogeneration. Feature modules (ai_engine, telegram_engine, ...)
import models from `app.models` rather than defining their own tables, so the
schema and migration history stay centralized.
"""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


def pg_enum(enum_cls: type[enum.Enum], name: str) -> Enum:
    """Postgres native enum that persists the *values* (not member names).

    Keeps a single definition shared by the model column and the migration.
    """
    return Enum(
        enum_cls,
        name=name,
        values_callable=lambda e: [member.value for member in e],
    )
