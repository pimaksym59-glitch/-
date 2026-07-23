"""Memory data-access (§R3.1, §R9). Channel isolation is mandatory (§R9.2)."""

from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import select

from app.models.enums import MemoryKind
from app.models.memory import Memory
from app.repositories.base import BaseRepository


class MemoryRepository(BaseRepository[Memory]):
    model = Memory

    async def list_by_channel(
        self, channel_id: uuid.UUID, *, kind: MemoryKind | None = None, limit: int = 500
    ) -> Sequence[Memory]:
        stmt = select(Memory).where(Memory.channel_id == channel_id)
        if kind is not None:
            stmt = stmt.where(Memory.kind == kind)
        stmt = stmt.order_by(Memory.created_at.desc()).limit(limit)
        result = await self.session.scalars(stmt)
        return result.all()
