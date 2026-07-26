"""Multi-platform messaging seam (owner req 16) — **extension point only, not implemented**. A
future
platform (e.g. another messenger) implements ``MessagingPlatform``; ``PublishService`` already
satisfies
it structurally. No other-messenger support is added here.
"""

from __future__ import annotations

from typing import Protocol

from app.telegram.types import PublishRequest, PublishResult


class MessagingPlatform(Protocol):
    async def publish(self, request: PublishRequest) -> PublishResult: ...
