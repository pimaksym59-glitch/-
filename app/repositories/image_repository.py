"""Image data-access (§R3.1). Channel isolation via explicit ``channel_id`` filter (§R9.2)."""

from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import select

from app.models.image import Image
from app.repositories.base import EntityRepository


class ImageRepository(EntityRepository[Image]):
    model = Image

    async def list_by_channel(
        self, channel_id: uuid.UUID, *, limit: int = 100, offset: int = 0
    ) -> Sequence[Image]:
        stmt = (
            select(Image)
            .where(Image.channel_id == channel_id, Image.deleted_at.is_(None))
            .order_by(Image.published_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.scalars(stmt)
        return result.all()
