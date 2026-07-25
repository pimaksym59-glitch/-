"""Deterministic, offline Telegram fake (§R2.10, owner req 11). "Sends" by recording the call and
returning a monotonic message id (no randomness, no network). Records sends for interaction
assertions. No business logic (no rate-limit handling here — that is the real adapter's concern).
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

from app.core.providers.base import Capability, ProviderKind
from app.core.providers.health import ProviderHealth
from app.core.providers.registry import FAKE_NAME
from app.telegram.base import SendResult


@dataclass(frozen=True, slots=True)
class SentRecord:
    method: str
    chat_id: int | str
    summary: str


class FakeTelegramProvider:
    name = FAKE_NAME
    kind = ProviderKind.telegram

    def __init__(self) -> None:
        self.sent: list[SentRecord] = []
        self._next_id = 0

    def capabilities(self) -> frozenset[Capability]:
        return frozenset(
            {Capability.send_message, Capability.send_photo, Capability.send_media_group}
        )

    async def health(self) -> ProviderHealth:
        return ProviderHealth(healthy=True)

    async def send_message(self, chat_id: int | str, text: str) -> SendResult:
        self.sent.append(SentRecord("send_message", chat_id, text))
        return SendResult(message_id=self._new_id(), chat_id=chat_id)

    async def send_photo(
        self, chat_id: int | str, photo: bytes, *, caption: str | None = None
    ) -> SendResult:
        self.sent.append(SentRecord("send_photo", chat_id, f"{len(photo)}B/{caption or ''}"))
        return SendResult(message_id=self._new_id(), chat_id=chat_id)

    async def send_media_group(
        self, chat_id: int | str, media: Sequence[bytes], *, caption: str | None = None
    ) -> list[SendResult]:
        results: list[SendResult] = []
        for index, item in enumerate(media):
            self.sent.append(SentRecord("send_media_group", chat_id, f"{index}:{len(item)}B"))
            results.append(SendResult(message_id=self._new_id(), chat_id=chat_id))
        return results

    def _new_id(self) -> int:
        self._next_id += 1
        return self._next_id
