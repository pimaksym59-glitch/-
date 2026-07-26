"""Update source (§R7.1, owner req 10) — Webhook and Polling are **interchangeable strategies**
behind
one ``UpdateSource`` Protocol; composition selects which. They yield **raw** update dicts
(mapping to
DTOs happens later, owner req 15). Real network transport is Runtime Verification Pending (RV-15);
offline, ``WebhookSource`` is fed directly and ``PollingSource`` uses an injected transport.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any, Protocol

RawUpdate = Mapping[str, Any]


class UpdateSource(Protocol):
    async def fetch(self) -> list[RawUpdate]: ...


class PollTransport(Protocol):
    """Real long-polling transport (Bot API getUpdates) — injected; concrete impl is RV-15."""

    async def get_updates(self, *, offset: int) -> list[RawUpdate]: ...


class PollingSource:
    def __init__(self, transport: PollTransport) -> None:
        self._transport = transport
        self._offset = 0

    async def fetch(self) -> list[RawUpdate]:
        updates = await self._transport.get_updates(offset=self._offset)
        if updates:
            self._offset = max(int(update.get("update_id", 0)) for update in updates) + 1
        return list(updates)


class WebhookSource:
    """Receives updates pushed by a webhook endpoint (``feed``) and drains them on ``fetch``."""

    def __init__(self) -> None:
        self._buffer: list[RawUpdate] = []

    def feed(self, updates: Sequence[RawUpdate]) -> None:
        self._buffer.extend(updates)

    async def fetch(self) -> list[RawUpdate]:
        drained = self._buffer[:]
        self._buffer.clear()
        return drained
