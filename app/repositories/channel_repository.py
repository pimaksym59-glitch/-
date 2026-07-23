"""Channel data-access (§R3.1). No domain logic."""

from __future__ import annotations

from sqlalchemy import select

from app.models.channel import Channel
from app.repositories.base import EntityRepository


class ChannelRepository(EntityRepository[Channel]):
    model = Channel

    async def get_by_telegram_id(self, telegram_channel_id: int) -> Channel | None:
        stmt = select(Channel).where(
            Channel.telegram_channel_id == telegram_channel_id,
            Channel.deleted_at.is_(None),
        )
        channel: Channel | None = await self.session.scalar(stmt)
        return channel
