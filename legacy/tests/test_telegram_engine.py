"""Unit tests for Telegram Engine (offline: FakeTelegramClient, no network)."""

from app.config import Settings
from telegram_engine.client import FakeTelegramClient, get_telegram_client
from telegram_engine.formatting import CAPTION_LIMIT, TEXT_LIMIT, render_message, truncate


# ── formatting ───────────────────────────────────────────────────────────
def test_truncate_short_unchanged():
    assert truncate("hello", 100) == "hello"


def test_truncate_long_adds_ellipsis_within_limit():
    out = truncate("x" * 200, 50)
    assert len(out) == 50
    assert out.endswith("…")


def test_render_uses_caption_limit_with_image():
    body = "y" * 5000
    assert len(render_message(body, has_image=True)) == CAPTION_LIMIT
    assert len(render_message(body, has_image=False)) == TEXT_LIMIT


def test_render_empty_body():
    assert render_message(None, has_image=False) == ""


# ── client ───────────────────────────────────────────────────────────────
async def test_fake_client_send_message_records_and_returns_id():
    client = FakeTelegramClient()
    mid1 = await client.send_message(chat_id="@ch", text="hi")
    mid2 = await client.send_message(chat_id="@ch", text="again")
    assert mid2 > mid1
    assert client.sent[0] == {"kind": "text", "chat_id": "@ch", "text": "hi", "message_id": mid1}


async def test_fake_client_send_photo_records_path_and_caption():
    client = FakeTelegramClient()
    mid = await client.send_photo(chat_id="@ch", photo_path="/m/a.png", caption="cap")
    assert client.sent[0]["kind"] == "photo"
    assert client.sent[0]["photo_path"] == "/m/a.png"
    assert client.sent[0]["caption"] == "cap"
    assert client.sent[0]["message_id"] == mid
    await client.aclose()


def test_get_client_falls_back_to_fake_without_token():
    assert isinstance(get_telegram_client(Settings(telegram_bot_token=None)), FakeTelegramClient)
