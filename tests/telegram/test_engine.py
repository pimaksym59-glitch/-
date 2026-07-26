"""Telegram engine tests (offline): dispatcher, outbound publishing (modes/idempotency/recovery)."""

from __future__ import annotations

from collections.abc import Sequence

from app.core.providers.base import Capability, ProviderKind
from app.core.providers.errors import AuthenticationError, ProviderError, RateLimitError
from app.core.providers.health import ProviderHealth
from app.telegram.base import SendResult, TelegramProvider
from app.telegram.dispatcher import Dispatcher
from app.telegram.fakes import (
    FakeIdempotencyGuard,
    FakeRateLimiter,
    FakeStateStore,
    FakeTelegramProvider,
)
from app.telegram.handlers import HandlerContext
from app.telegram.mapping import map_update
from app.telegram.publishing import PublishService
from app.telegram.registry import HandlerRegistry
from app.telegram.router import Router
from app.telegram.types import (
    Attachment,
    PublishRequest,
    RouteRule,
    SessionContext,
    Update,
    UpdateKind,
)


def _ctx(provider: TelegramProvider) -> HandlerContext:
    return HandlerContext(
        provider=provider,
        state=FakeStateStore(),
        session=SessionContext(chat_id=1, user_id=1, state_key="1:1"),
    )


# --- dispatcher ----------------------------------------------------------------------------------


async def test_dispatcher_routes_to_handler() -> None:
    seen: list[str] = []

    class _Handler:
        async def handle(self, update: Update, ctx: HandlerContext) -> None:
            assert update.command is not None
            seen.append(update.command.name)

    registry = HandlerRegistry()
    registry.register("start", _Handler())
    dispatcher = Dispatcher(
        Router([RouteRule(handler="start", kind=UpdateKind.command, command="start")]), registry
    )
    update = map_update(
        {"update_id": 1, "message": {"message_id": 1, "chat": {"id": 1}, "text": "/start"}}
    )
    assert await dispatcher.dispatch(update, _ctx(FakeTelegramProvider()))
    assert seen == ["start"]


async def test_dispatcher_returns_false_when_unrouted() -> None:
    dispatcher = Dispatcher(Router([]), HandlerRegistry())
    assert not await dispatcher.dispatch(
        Update(1, UpdateKind.unknown), _ctx(FakeTelegramProvider())
    )


# --- publishing (§R7.8) --------------------------------------------------------------------------


def _publisher(provider: TelegramProvider, *, allow: bool = True) -> PublishService:
    return PublishService(
        provider,
        idempotency=FakeIdempotencyGuard(),
        rate_limiter=FakeRateLimiter(allow=allow),
    )


async def test_publish_text() -> None:
    provider = FakeTelegramProvider()
    result = await _publisher(provider).publish(PublishRequest(chat_id=1, dedup_key="k", text="hi"))
    assert result.sent and result.status == "published" and result.message_ids == (1,)
    assert provider.sent[0].method == "send_message"


async def test_publish_album() -> None:
    provider = FakeTelegramProvider()
    request = PublishRequest(
        chat_id=1,
        dedup_key="k",
        text="album",
        attachments=(Attachment("photo", data=b"a"), Attachment("photo", data=b"b")),
    )
    result = await _publisher(provider).publish(request)
    assert result.sent and len(result.message_ids) == 2
    assert provider.sent[0].method == "send_media_group"


async def test_publish_single_photo() -> None:
    provider = FakeTelegramProvider()
    request = PublishRequest(
        chat_id=1, dedup_key="k", text="cap", attachments=(Attachment("photo", data=b"x"),)
    )
    result = await _publisher(provider).publish(request)
    assert result.sent and provider.sent[0].method == "send_photo"


async def test_publish_draft_does_not_send() -> None:
    provider = FakeTelegramProvider()
    result = await _publisher(provider).publish(
        PublishRequest(chat_id=1, dedup_key="k", text="d", draft=True)
    )
    assert not result.sent and result.status == "draft" and not provider.sent


async def test_publish_idempotent_skip() -> None:
    provider = FakeTelegramProvider()
    publisher = _publisher(provider)
    first = await publisher.publish(PublishRequest(chat_id=1, dedup_key="dup", text="a"))
    second = await publisher.publish(PublishRequest(chat_id=1, dedup_key="dup", text="a"))
    assert first.sent and not second.sent and second.status == "skipped"
    assert len(provider.sent) == 1  # sent once


async def test_publish_rate_limited_needs_review() -> None:
    result = await _publisher(FakeTelegramProvider(), allow=False).publish(
        PublishRequest(chat_id=1, dedup_key="k", text="hi")
    )
    assert not result.sent and result.status == "needs_review" and result.reason == "rate_limited"


class _FailingProvider:
    name = "failing"
    kind = ProviderKind.telegram

    def __init__(self, error: ProviderError) -> None:
        self._error = error

    def capabilities(self) -> frozenset[Capability]:
        return frozenset({Capability.send_message})

    async def health(self) -> ProviderHealth:
        return ProviderHealth(healthy=True)

    async def send_message(self, chat_id: int | str, text: str) -> SendResult:
        raise self._error

    async def send_photo(
        self, chat_id: int | str, photo: bytes, *, caption: str | None = None
    ) -> SendResult:
        raise self._error

    async def send_media_group(
        self, chat_id: int | str, media: Sequence[bytes], *, caption: str | None = None
    ) -> list[SendResult]:
        raise self._error


async def test_publish_permanent_error_needs_review() -> None:
    result = await _publisher(_FailingProvider(AuthenticationError("bad token"))).publish(
        PublishRequest(chat_id=1, dedup_key="k", text="hi")
    )
    assert not result.sent and result.status == "needs_review"


async def test_publish_transient_error_failed() -> None:
    result = await _publisher(_FailingProvider(RateLimitError("429"))).publish(
        PublishRequest(chat_id=1, dedup_key="k", text="hi")
    )
    assert not result.sent and result.status == "failed"  # queue Executor retries
