"""Dispatcher — orchestration only: run middleware, resolve the route, invoke the registered
handler.
No business logic; no error-recovery logic (that is a separate pipeline, owner req 13).
"""

from __future__ import annotations

from app.telegram.handlers import HandlerContext
from app.telegram.middleware import MiddlewarePipeline
from app.telegram.registry import HandlerRegistry
from app.telegram.router import Router
from app.telegram.types import Update


class Dispatcher:
    def __init__(
        self,
        router: Router,
        registry: HandlerRegistry,
        *,
        middleware: MiddlewarePipeline | None = None,
    ) -> None:
        self._router = router
        self._registry = registry
        self._middleware = middleware if middleware is not None else MiddlewarePipeline()

    async def dispatch(self, update: Update, ctx: HandlerContext) -> bool:
        """Route and handle one update. Returns True if a handler ran, False if unrouted."""
        await self._middleware.run(update, ctx)
        name = self._router.resolve(update)
        if name is None:
            return False
        handler = self._registry.get(name)
        await handler.handle(update, ctx)
        return True
