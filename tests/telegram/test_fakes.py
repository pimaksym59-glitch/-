"""Telegram fake tests (§R7, owner req 4/11): Protocol-conformant, deterministic ids, records."""

from __future__ import annotations

from app.core.providers.base import Capability, ProviderKind
from app.telegram.base import TelegramProvider
from app.telegram.fakes import FakeTelegramProvider


def test_fake_telegram_conforms_to_protocol() -> None:
    provider: TelegramProvider = FakeTelegramProvider()
    assert provider.kind is ProviderKind.telegram
    assert Capability.send_message in provider.capabilities()


async def test_send_message_returns_deterministic_ids_and_records() -> None:
    provider = FakeTelegramProvider()
    first = await provider.send_message(100, "hi")
    second = await provider.send_message(100, "again")
    assert (first.message_id, second.message_id) == (1, 2)  # monotonic, no randomness
    assert first.chat_id == 100
    assert [record.method for record in provider.sent] == ["send_message", "send_message"]


async def test_send_photo_and_media_group() -> None:
    provider = FakeTelegramProvider()
    photo = await provider.send_photo(1, b"bytes", caption="c")
    group = await provider.send_media_group(1, [b"a", b"bb"])
    assert photo.message_id == 1
    assert [result.message_id for result in group] == [2, 3]
    assert [record.method for record in provider.sent] == [
        "send_photo",
        "send_media_group",
        "send_media_group",
    ]
