"""Post data-access (§R3.1). Channel isolation via explicit ``channel_id`` filter (§R9.2)."""

from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import select

from app.models.content import Post
from app.models.enums import PostStatus
from app.repositories.base import EntityRepository


class PostRepository(EntityRepository[Post]):
    model = Post

    async def list_by_channel(
        self,
        channel_id: uuid.UUID,
        *,
        status: PostStatus | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Sequence[Post]:
        """Posts of ONE channel, never a mix (§R2.6/§R9.2 — the channel filter is not optional).

        The optional `status` narrows the same query (API_SPEC `GET /channels/{id}/posts?status=`).
        Unpublished posts have a NULL `published_at`, so `created_at` is the tie-breaker that keeps
        a needs-review queue in a stable, newest-first order instead of an arbitrary one.
        """
        stmt = select(Post).where(Post.channel_id == channel_id, Post.deleted_at.is_(None))
        if status is not None:
            stmt = stmt.where(Post.status == status)
        stmt = (
            stmt.order_by(Post.published_at.desc().nullslast(), Post.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.scalars(stmt)
        return result.all()
