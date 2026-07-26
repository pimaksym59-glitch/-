"""Domain: Telegram transport (§R7) — a library-agnostic engine over the Stage-11
``TelegramProvider``
protocol (no aiogram in the domain). Inbound update handling (source/pipeline/router/dispatcher/
handlers) and outbound publishing (modes/formatter/rate-limit/idempotency/recovery) — no
AI/Validation/
Image business logic. Independent of those engines; interacts only through public Protocols.
"""

from __future__ import annotations

from app.telegram.base import SendResult, TelegramProvider
from app.telegram.dispatcher import Dispatcher
from app.telegram.engine import TelegramEngine, default_session
from app.telegram.handlers import (
    CallbackHandler,
    CommandHandler,
    HandlerContext,
    MessageHandler,
    TelegramHandler,
)
from app.telegram.idempotency import IdempotencyGuard
from app.telegram.middleware import MiddlewarePipeline, UpdateMiddleware
from app.telegram.publishing import PublishService
from app.telegram.ratelimit import RateLimiter, rate_limit_key
from app.telegram.recovery import ErrorRecoveryPipeline, RecoveryOutcome
from app.telegram.registry import HandlerNotRegistered, HandlerRegistry
from app.telegram.router import Router
from app.telegram.source import PollingSource, UpdateSource, WebhookSource
from app.telegram.state import StateStore
from app.telegram.types import (
    Attachment,
    CallbackQuery,
    Chat,
    Command,
    IncomingMessage,
    ParseMode,
    PublishRequest,
    PublishResult,
    RouteRule,
    SessionContext,
    TelegramUser,
    Update,
    UpdateKind,
)
from app.telegram.updates import UpdateProcessingPipeline

__all__ = [
    "Attachment",
    "CallbackHandler",
    "CallbackQuery",
    "Chat",
    "Command",
    "CommandHandler",
    "Dispatcher",
    "ErrorRecoveryPipeline",
    "HandlerContext",
    "HandlerNotRegistered",
    "HandlerRegistry",
    "IdempotencyGuard",
    "IncomingMessage",
    "MessageHandler",
    "MiddlewarePipeline",
    "ParseMode",
    "PollingSource",
    "PublishRequest",
    "PublishResult",
    "PublishService",
    "RateLimiter",
    "RecoveryOutcome",
    "RouteRule",
    "Router",
    "SendResult",
    "SessionContext",
    "StateStore",
    "TelegramEngine",
    "TelegramHandler",
    "TelegramProvider",
    "TelegramUser",
    "Update",
    "UpdateKind",
    "UpdateMiddleware",
    "UpdateProcessingPipeline",
    "UpdateSource",
    "WebhookSource",
    "default_session",
    "rate_limit_key",
]
