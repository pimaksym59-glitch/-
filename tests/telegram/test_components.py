"""Telegram component tests (§R7): mapping, formatter, attachments, router, registry, ports."""

from __future__ import annotations

import pytest

from app.core.providers.errors import AuthenticationError, RateLimitError
from app.telegram.attachments import AttachmentError, AttachmentPipeline
from app.telegram.fakes import (
    FakeIdempotencyGuard,
    FakeRateLimiter,
    FakeStateStore,
    FakeTelegramProvider,
    FakeUpdateSource,
)
from app.telegram.formatter import escape, truncate_caption, truncate_text
from app.telegram.handlers import HandlerContext
from app.telegram.mapping import map_update
from app.telegram.middleware import MiddlewarePipeline
from app.telegram.multiplatform import MessagingPlatform
from app.telegram.ratelimit import rate_limit_key
from app.telegram.recovery import ErrorRecoveryPipeline, RecoveryOutcome
from app.telegram.registry import HandlerNotRegistered, HandlerRegistry
from app.telegram.retry import classify, retry_after_seconds
from app.telegram.router import Router
from app.telegram.source import PollingSource, RawUpdate, WebhookSource
from app.telegram.types import (
    Attachment,
    ParseMode,
    RouteRule,
    SessionContext,
    Update,
    UpdateKind,
)
from app.workers.retry import ErrorClass

# --- mapping (req 15) ----------------------------------------------------------------------------


def test_map_command_message_callback_unknown() -> None:
    cmd = map_update(
        {"update_id": 1, "message": {"message_id": 5, "chat": {"id": 9}, "text": "/go a b"}}
    )
    assert cmd.kind is UpdateKind.command and cmd.command is not None
    assert cmd.command.name == "go" and cmd.command.args == ("a", "b")

    msg = map_update(
        {"update_id": 2, "message": {"message_id": 6, "chat": {"id": 9}, "text": "hi"}}
    )
    assert msg.kind is UpdateKind.message and msg.message is not None and msg.message.text == "hi"

    cb = map_update(
        {"update_id": 3, "callback_query": {"id": "c1", "from": {"id": 7}, "data": "x"}}
    )
    assert cb.kind is UpdateKind.callback_query and cb.callback_query is not None

    assert map_update({"update_id": 4}).kind is UpdateKind.unknown


def test_map_attachments() -> None:
    update = map_update(
        {
            "update_id": 1,
            "message": {"message_id": 1, "chat": {"id": 1}, "photo": [{"file_id": "p"}]},
        }
    )
    assert update.message is not None and update.message.attachments[0].kind == "photo"


def test_map_document_and_video() -> None:
    update = map_update(
        {
            "update_id": 1,
            "message": {
                "message_id": 1,
                "chat": {"id": 1},
                "document": {"file_id": "d"},
                "video": {"file_id": "v"},
            },
        }
    )
    assert update.message is not None
    assert {a.kind for a in update.message.attachments} == {"document", "video"}


# --- formatter (§R7.7) ---------------------------------------------------------------------------


def test_formatter_escapes_and_truncates() -> None:
    assert escape("a_b*c", ParseMode.markdown_v2) == r"a\_b\*c"
    assert escape("a<b>&c", ParseMode.html) == "a&lt;b&gt;&amp;c"
    assert escape("a_b", ParseMode.plain) == "a_b"
    assert len(truncate_text("x" * 5000)) == 4096
    assert len(truncate_caption("y" * 2000)) == 1024


# --- attachments (req 9) -------------------------------------------------------------------------


def test_attachment_pipeline_limits_and_kinds() -> None:
    pipeline = AttachmentPipeline()
    assert len(pipeline.process([Attachment("photo"), Attachment("video")])) == 2
    with pytest.raises(AttachmentError, match="album exceeds"):
        pipeline.process([Attachment("photo")] * 11)
    with pytest.raises(AttachmentError, match="unknown attachment"):
        pipeline.process([Attachment("sticker")])


# --- router (req 3) ------------------------------------------------------------------------------


def test_router_is_declarative() -> None:
    router = Router(
        [
            RouteRule(handler="start", kind=UpdateKind.command, command="start"),
            RouteRule(handler="any_msg", kind=UpdateKind.message),
        ]
    )
    start = map_update(
        {"update_id": 1, "message": {"message_id": 1, "chat": {"id": 1}, "text": "/start"}}
    )
    text = map_update(
        {"update_id": 2, "message": {"message_id": 2, "chat": {"id": 1}, "text": "hey"}}
    )
    assert router.resolve(start) == "start"
    assert router.resolve(text) == "any_msg"
    assert router.resolve(Update(3, UpdateKind.unknown)) is None


# --- registry (req 4) ----------------------------------------------------------------------------


class _Noop:
    async def handle(self, update: Update, ctx: object) -> None: ...


def test_registry_typed_deterministic_unknown() -> None:
    registry = HandlerRegistry()
    registry.register("b", _Noop())
    registry.register("a", _Noop())
    assert registry.names() == ("a", "b")  # sorted -> deterministic
    with pytest.raises(ValueError, match="already registered"):
        registry.register("a", _Noop())
    with pytest.raises(HandlerNotRegistered):
        registry.get("missing")


# --- source (req 10) -----------------------------------------------------------------------------


async def test_webhook_and_polling_sources_interchangeable() -> None:
    webhook = WebhookSource()
    webhook.feed([{"update_id": 1}])
    assert await webhook.fetch() == [{"update_id": 1}]
    assert await webhook.fetch() == []  # drained

    class _Transport:
        async def get_updates(self, *, offset: int) -> list[RawUpdate]:
            return [{"update_id": 5}] if offset == 0 else []

    polling = PollingSource(_Transport())
    assert await polling.fetch() == [{"update_id": 5}]
    assert await polling.fetch() == []  # offset advanced past 5

    fake = FakeUpdateSource([[{"update_id": 9}]])
    assert await fake.fetch() == [{"update_id": 9}]
    assert await fake.fetch() == []


# --- ports: state / ratelimit / idempotency ------------------------------------------------------


async def test_state_store_fake() -> None:
    store = FakeStateStore()
    await store.set("k", {"step": "1"})
    assert dict(await store.get("k")) == {"step": "1"}
    await store.clear("k")
    assert dict(await store.get("k")) == {}


def test_rate_limit_key() -> None:
    assert rate_limit_key("tok", 42) == "tg:tok:42"


async def test_idempotency_guard_fake() -> None:
    guard = FakeIdempotencyGuard()
    assert not await guard.seen("k")
    await guard.mark("k")
    assert await guard.seen("k")


async def test_ratelimiter_fake_allow_deny() -> None:
    assert await FakeRateLimiter().acquire("k")
    assert not await FakeRateLimiter(allow=False).acquire("k")


# --- retry / recovery (§R7.4/R7.5, req 11/13) ----------------------------------------------------


def test_retry_classification_reuses_workers() -> None:
    assert classify(RateLimitError("429", retry_after=3.0)) is ErrorClass.transient
    assert classify(AuthenticationError("bad token")) is ErrorClass.permanent
    assert retry_after_seconds(RateLimitError("429", retry_after=3.0)) == 3.0
    assert retry_after_seconds(AuthenticationError("x")) is None


def test_recovery_pipeline() -> None:
    pipeline = ErrorRecoveryPipeline(max_retries=5)
    assert pipeline.recover(RateLimitError("429"), attempts=0) is RecoveryOutcome.retry
    assert pipeline.recover(AuthenticationError("x"), attempts=0) is RecoveryOutcome.needs_review
    # §R7.4 ambiguous -> needs_review regardless of error class
    assert (
        pipeline.recover(RateLimitError("429"), attempts=0, ambiguous=True)
        is RecoveryOutcome.needs_review
    )


# --- middleware (req 6) + multi-platform seam (req 16) -------------------------------------------


async def test_middleware_pipeline_runs_in_order() -> None:
    calls: list[str] = []

    class _MW:
        def __init__(self, tag: str) -> None:
            self._tag = tag

        async def process(self, update: Update, ctx: HandlerContext) -> None:
            calls.append(self._tag)

    ctx = HandlerContext(
        provider=FakeTelegramProvider(),
        state=FakeStateStore(),
        session=SessionContext(chat_id=0, user_id=None, state_key="0"),
    )
    await MiddlewarePipeline([_MW("a"), _MW("b")]).run(Update(1, UpdateKind.unknown), ctx)
    assert calls == ["a", "b"]


def test_multiplatform_seam_is_extension_point() -> None:
    assert hasattr(MessagingPlatform, "publish")  # extension point only (owner req 16)
