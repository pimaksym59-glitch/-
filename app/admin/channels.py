"""Channel management (owner reqs 8, 11) — an independent service (§R2.6).

Channels are read/written through a :class:`ChannelStore` port; the bot-token reference is a
secret and is never exposed in views (via the mapping layer). Writes require CHANNELS_WRITE
(owner/admin, §R10.5).

"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

from app.admin.authorization import RbacAuthorization
from app.admin.dto import ChannelRecord, ChannelView
from app.admin.exceptions import NotFoundInAdmin
from app.admin.mapping import to_channel_view
from app.admin.pagination import Page, PageRequest, paginate
from app.admin.rbac import Permission
from app.admin.types import AdminActor


class ChannelStore(Protocol):
    """Persistence port for channels (real backend is RV-17)."""

    def list_channels(self) -> Sequence[ChannelRecord]: ...

    def get(self, channel_id: str) -> ChannelRecord | None: ...

    def upsert(self, record: ChannelRecord) -> None: ...


class ChannelService:
    """Independent channel-management service (§R2.6/§R10.5)."""

    def __init__(self, store: ChannelStore, authz: RbacAuthorization) -> None:
        self._store = store
        self._authz = authz

    def list_channels(
        self, actor: AdminActor, request: PageRequest | None = None
    ) -> Page[ChannelView]:
        self._authz.require(actor, Permission.CHANNELS_READ)
        views = [to_channel_view(record) for record in self._store.list_channels()]
        return paginate(views, request or PageRequest())

    def rename(self, actor: AdminActor, channel_id: str, title: str) -> ChannelView:
        """Rename a channel (requires CHANNELS_WRITE)."""

        self._authz.require(actor, Permission.CHANNELS_WRITE)
        record = self._store.get(channel_id)
        if record is None:
            raise NotFoundInAdmin(f"channel not found: {channel_id}")
        updated = ChannelRecord(
            id=record.id,
            title=title,
            status=record.status,
            language=record.language,
            bot_token_ref=record.bot_token_ref,
        )
        self._store.upsert(updated)
        return to_channel_view(updated)
