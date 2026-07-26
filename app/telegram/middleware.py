"""Middleware pipeline (owner req 6) — fully modular. Each ``UpdateMiddleware`` has one
responsibility
and runs in order before dispatch. Adding middleware needs no change to the others or the
dispatcher.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

from app.telegram.handlers import HandlerContext
from app.telegram.types import Update


class UpdateMiddleware(Protocol):
    async def process(self, update: Update, ctx: HandlerContext) -> None: ...


class MiddlewarePipeline:
    def __init__(self, middlewares: Sequence[UpdateMiddleware] = ()) -> None:
        self._middlewares = tuple(middlewares)

    async def run(self, update: Update, ctx: HandlerContext) -> None:
        for middleware in self._middlewares:
            await middleware.process(update, ctx)
