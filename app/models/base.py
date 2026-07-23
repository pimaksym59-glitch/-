"""Base entity (§R4.2): UUIDv7 PK, timestamps, soft delete, optimistic-lock ``version``.

Concrete models inherit ``Entity``. Soft delete (§R4.4) uses ``deleted_at``; natural keys are
declared as partial-unique indexes ``WHERE deleted_at IS NULL`` on the owning model.
"""

from __future__ import annotations

import datetime
import uuid
from typing import Any

from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, declared_attr, mapped_column

from app.db.base import Base
from app.db.types import uuid7_default


class Entity(Base):
    """Abstract base with common columns and optimistic-locking mapper args (§R4.2)."""

    __abstract__ = True

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid7_default)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    deleted_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )
    version: Mapped[int] = mapped_column(nullable=False, server_default="1")

    @declared_attr.directive
    def __mapper_args__(cls) -> dict[str, Any]:
        # ORM-managed optimistic locking on the `version` column (§R4.2).
        return {"version_id_col": cls.version}


class Record(Base):
    """Abstract base for append-only / insert-only rows (history, usage, logs, audit).

    Only a UUIDv7 PK and ``created_at`` — no ``updated_at``/``deleted_at``/optimistic ``version``.
    """

    __abstract__ = True

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid7_default)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
