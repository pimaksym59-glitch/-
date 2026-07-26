"""Telegram composition tests (§R7, §R2.10): build_telegram_engine / publish_post offline."""

from __future__ import annotations

import pytest

from app.core.config import Settings
from app.services.telegram import build_telegram_engine, publish_post
from app.telegram.fakes import FakeUpdateSource
from app.telegram.registry import HandlerRegistry
from app.telegram.router import Router
from app.telegram.types import PublishRequest, RouteRule, Update, UpdateKind


@pytest.fixture(autouse=True)
def _no_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    for var in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "TELEGRAM_BOT_TOKEN"):
        monkeypatch.delenv(var, raising=False)


async def test_publish_post_offline() -> None:
    result = await publish_post(Settings(), PublishRequest(chat_id=1, dedup_key="k", text="hi"))
    assert result.sent and result.status == "published"


async def test_build_engine_dispatches_and_publishes() -> None:
    handled: list[int] = []

    class _Echo:
        async def handle(self, update: Update, ctx: object) -> None:
            handled.append(update.update_id)

    registry = HandlerRegistry()
    registry.register("msg", _Echo())
    router = Router([RouteRule(handler="msg", kind=UpdateKind.message)])
    raw = [{"update_id": 7, "message": {"message_id": 1, "chat": {"id": 1}, "text": "hey"}}]
    engine = build_telegram_engine(
        Settings(), source=FakeUpdateSource([raw]), router=router, registry=registry
    )
    assert await engine.pump() == 1 and handled == [7]
    result = await engine.publish(PublishRequest(chat_id=1, dedup_key="k2", text="x"))
    assert result.sent
