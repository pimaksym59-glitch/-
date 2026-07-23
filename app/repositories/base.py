"""Generic async data-access repositories (§R3.1).

Repositories hold **no domain logic** and **do not commit** — the caller (a service / unit-of-work,
later stages) owns the transaction (§R4.11). Channel-scoped helpers enforce isolation (§R9.2) by
always filtering ``channel_id`` at query time.
"""

from __future__ import annotations

import datetime
import uuid
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base
from app.models.base import Entity


class BaseRepository[ModelT: Base]:
    """CRUD read/insert over a model. ``model`` is set by concrete subclasses."""

    model: type[ModelT]

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, entity_id: uuid.UUID) -> ModelT | None:
        return await self.session.get(self.model, entity_id)

    def add(self, obj: ModelT) -> ModelT:
        self.session.add(obj)
        return obj

    async def list_all(self, *, limit: int = 100, offset: int = 0) -> Sequence[ModelT]:
        result = await self.session.scalars(select(self.model).limit(limit).offset(offset))
        return result.all()


class EntityRepository[EntityT: Entity](BaseRepository[EntityT]):
    """Adds soft-delete-aware listing and soft delete for ``Entity`` models (§R4.4)."""

    async def list_active(self, *, limit: int = 100, offset: int = 0) -> Sequence[EntityT]:
        stmt = select(self.model).where(self.model.deleted_at.is_(None)).limit(limit).offset(offset)
        result = await self.session.scalars(stmt)
        return result.all()

    async def soft_delete(self, obj: EntityT) -> None:
        obj.deleted_at = datetime.datetime.now(datetime.UTC)
