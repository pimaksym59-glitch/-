"""Telegram composition root (§R7, §R2.10). Assembles the Telegram Engine with the Stage-11 provider
and offline-safe defaults (deterministic fake source/state/rate-limiter/idempotency). Webhook vs
polling and the real Redis-backed rate-limiter/idempotency/state plug in **here** (RV-15); the
domain
stays library-agnostic. No AI/Validation/Image logic.
"""

from __future__ import annotations

from app.core.config import Settings
from app.services.providers import get_telegram_provider
from app.telegram.dispatcher import Dispatcher
from app.telegram.engine import TelegramEngine
from app.telegram.fakes import (
    FakeIdempotencyGuard,
    FakeRateLimiter,
    FakeStateStore,
    FakeUpdateSource,
)
from app.telegram.idempotency import IdempotencyGuard
from app.telegram.middleware import MiddlewarePipeline
from app.telegram.publishing import PublishService
from app.telegram.ratelimit import RateLimiter
from app.telegram.recovery import ErrorRecoveryPipeline
from app.telegram.registry import HandlerRegistry
from app.telegram.router import Router
from app.telegram.source import UpdateSource
from app.telegram.state import StateStore
from app.telegram.types import PublishRequest, PublishResult
from app.telegram.updates import UpdateProcessingPipeline


def build_publish_service(
    settings: Settings,
    *,
    idempotency: IdempotencyGuard | None = None,
    rate_limiter: RateLimiter | None = None,
    bot_token: str = "",
) -> PublishService:
    return PublishService(
        get_telegram_provider(settings),
        idempotency=idempotency if idempotency is not None else FakeIdempotencyGuard(),
        rate_limiter=rate_limiter if rate_limiter is not None else FakeRateLimiter(),
        recovery=ErrorRecoveryPipeline(max_retries=settings.max_retries),
        bot_token=bot_token,
    )


def build_telegram_engine(
    settings: Settings,
    *,
    source: UpdateSource | None = None,
    router: Router | None = None,
    registry: HandlerRegistry | None = None,
    middleware: MiddlewarePipeline | None = None,
    state: StateStore | None = None,
    idempotency: IdempotencyGuard | None = None,
    rate_limiter: RateLimiter | None = None,
    bot_token: str = "",
) -> TelegramEngine:
    """Assemble a TelegramEngine (offline defaults: fake source/state/rate-limiter/idempotency)."""
    provider = get_telegram_provider(settings)
    state_store = state if state is not None else FakeStateStore()
    dispatcher = Dispatcher(
        router if router is not None else Router(()),
        registry if registry is not None else HandlerRegistry(),
        middleware=middleware,
    )
    publisher = build_publish_service(
        settings, idempotency=idempotency, rate_limiter=rate_limiter, bot_token=bot_token
    )
    return TelegramEngine(
        source=source if source is not None else FakeUpdateSource([]),
        pipeline=UpdateProcessingPipeline(),
        dispatcher=dispatcher,
        publisher=publisher,
        provider=provider,
        state=state_store,
    )


async def publish_post(settings: Settings, request: PublishRequest) -> PublishResult:
    """Convenience: publish one post via a freshly composed engine (offline defaults)."""
    return await build_publish_service(settings).publish(request)
