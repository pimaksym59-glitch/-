"""Handlers (§R7, owner req 5) — Command, Callback and Message handlers are **independent**
Protocols
with **no shared base class**. Each receives the mapped ``Update`` and a ``HandlerContext``
(reply via
the ``TelegramProvider`` port, read/write state via the ``StateStore`` port). No business logic
of the
AI/Validation/Image engines here — this is transport.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from app.telegram.base import TelegramProvider
from app.telegram.state import StateStore
from app.telegram.types import SessionContext, Update


@dataclass(frozen=True, slots=True)
class HandlerContext:
    provider: TelegramProvider
    state: StateStore
    session: SessionContext


class CommandHandler(Protocol):
    async def handle(self, update: Update, ctx: HandlerContext) -> None: ...


class CallbackHandler(Protocol):
    async def handle(self, update: Update, ctx: HandlerContext) -> None: ...


class MessageHandler(Protocol):
    async def handle(self, update: Update, ctx: HandlerContext) -> None: ...


TelegramHandler = CommandHandler | CallbackHandler | MessageHandler
