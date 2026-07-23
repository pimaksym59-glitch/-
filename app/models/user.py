"""User & governance models (§R10.5, §R10.8): users, audit_log, config_versions."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import ForeignKey, Index, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Entity, Record
from app.models.enums import USER_ROLE, UserRole


class User(Entity):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(Text)
    role: Mapped[UserRole] = mapped_column(USER_ROLE)
    password_hash: Mapped[str | None] = mapped_column(Text)
    mfa_secret_ref: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (
        Index("uq_users_email", "email", unique=True, postgresql_where=text("deleted_at IS NULL")),
    )


class AuditLog(Record):
    __tablename__ = "audit_log"

    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(Text)
    entity: Mapped[str | None] = mapped_column(Text)
    entity_id: Mapped[uuid.UUID | None]
    before: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    after: Mapped[dict[str, Any] | None] = mapped_column(JSONB)


class ConfigVersion(Record):
    __tablename__ = "config_versions"

    author: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    description: Mapped[str | None] = mapped_column(Text)
    snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
