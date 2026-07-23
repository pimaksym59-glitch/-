"""Post data-access (§R3.1). Channel isolation via explicit ``channel_id`` filter (§R9.2)."""

from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import select

from app.models.content import Post
from app.repositories.base import EntityRepository


class PostRepository(EntityRepository[Post]):
    model = Post

    async def list_by_channel(
        self, channel_id: uuid.UUID, *, limit: int = 100, offset: int = 0
    ) -> Sequence[Post]:
        stmt = (
            select(Post)
            .where(Post.channel_id == channel_id, Post.deleted_at.is_(None))
            .order_by(Post.published_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.scalars(stmt)
        return result.all()
