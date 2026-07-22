"""Telegram client abstraction.

`AiogramTelegramClient` publishes via the Bot API; `FakeTelegramClient` records
sends and returns incrementing message ids (dev / tests, nothing leaves the
process). `get_telegram_client(settings)` selects between them.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from app.config import Settings


@runtime_checkable
class TelegramClient(Protocol):
    async def send_message(self, *, chat_id: str, text: str) -> int: ...

    async def send_photo(self, *, chat_id: str, photo_path: str, caption: str) -> int: ...

    async def aclose(self) -> None: ...


class AiogramTelegramClient:
    def __init__(self, settings: Settings) -> None:
        from aiogram import Bot  # lazy: keep import light for tests/offline

        self._bot = Bot(token=settings.telegram_bot_token)

    async def send_message(self, *, chat_id: str, text: str) -> int:
        message = await self._bot.send_message(chat_id=chat_id, text=text)
        return message.message_id

    async def send_photo(self, *, chat_id: str, photo_path: str, caption: str) -> int:
        from aiogram.types import FSInputFile

        message = await self._bot.send_photo(
            chat_id=chat_id, photo=FSInputFile(photo_path), caption=caption
        )
        return message.message_id

    async def aclose(self) -> None:
        await self._bot.session.close()


class FakeTelegramClient:
    """Records sends; returns increasing message ids. Nothing is transmitted."""

    def __init__(self) -> None:
        self.sent: list[dict] = []
        self._next_id = 1000

    def _emit(self, payload: dict) -> int:
        self._next_id += 1
        self.sent.append({**payload, "message_id": self._next_id})
        return self._next_id

    async def send_message(self, *, chat_id: str, text: str) -> int:
        return self._emit({"kind": "text", "chat_id": chat_id, "text": text})

    async def send_photo(self, *, chat_id: str, photo_path: str, caption: str) -> int:
        return self._emit(
            {"kind": "photo", "chat_id": chat_id, "photo_path": photo_path, "caption": caption}
        )

    async def aclose(self) -> None:
        return None


def get_telegram_client(settings: Settings) -> TelegramClient:
    if settings.telegram_bot_token:
        return AiogramTelegramClient(settings)
    return FakeTelegramClient()
