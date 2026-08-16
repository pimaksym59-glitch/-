"""Channel DTOs (API_SPEC §"Channels") — Stage 21 Phase 3A.

`name` is the wire field; the column behind it is `channels.title` (owner decision D3 — the column
name is an implementation detail, the wire name is the contract). The bot-token reference is never
part of any response (§R12.2/§R10.4 — secrets are write-only).
"""

from __future__ import annotations

from app.schemas.base import Schema


class ChannelResponse(Schema):
    """One channel as the console consumes it."""

    id: str
    name: str
    status: str
    description: str | None = None
