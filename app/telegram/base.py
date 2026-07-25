"""Telegram provider protocol (§R7, Bot API). Port only — no aiogram/HTTP/DB. Real adapter (aiogram)
and the fake implement this; it extends the generic ``Provider`` contract.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol

from app.core.providers.base import Provider


@dataclass(frozen=True, slots=True)
class SendResult:
    message_id: int
    chat_id: int | str


class TelegramProvider(Provider, Protocol):
    async def send_message(self, chat_id: int | str, text: str) -> SendResult: ...

    async def send_photo(
        self, chat_id: int | str, photo: bytes, *, caption: str | None = None
    ) -> SendResult: ...

    async def send_media_group(
        self, chat_id: int | str, media: Sequence[bytes], *, caption: str | None = None
    ) -> list[SendResult]: ...
