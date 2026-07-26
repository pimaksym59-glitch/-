"""Telegram Engine (§R7) — the transport layer. Inbound: pull raw updates from the ``UpdateSource``
strategy, process them into DTOs, dispatch to handlers. Outbound: publish via ``PublishService``. It
holds **no** AI/Validation/Image business logic (owner req 1); everything Telegram goes through the
Stage-11 provider and the ports.
"""

from __future__ import annotations

from collections.abc import Callable

from app.telegram.base import TelegramProvider
from app.telegram.dispatcher import Dispatcher
from app.telegram.handlers import HandlerContext
from app.telegram.publishing import PublishService
from app.telegram.source import UpdateSource
from app.telegram.state import StateStore
from app.telegram.types import PublishRequest, PublishResult, SessionContext, Update
from app.telegram.updates import UpdateProcessingPipeline


def default_session(update: Update) -> SessionContext:
    """Derive a session key from the update's chat/user (composition may override)."""
    message = update.message or (update.callback_query.message if update.callback_query else None)
    chat_id = message.chat.id if message else 0
    user = message.from_user if message else None
    if update.callback_query is not None:
        user = update.callback_query.from_user
    user_id = user.id if user else None
    return SessionContext(chat_id=chat_id, user_id=user_id, state_key=f"{chat_id}:{user_id}")


class TelegramEngine:
    def __init__(
        self,
        *,
        source: UpdateSource,
        pipeline: UpdateProcessingPipeline,
        dispatcher: Dispatcher,
        publisher: PublishService,
        provider: TelegramProvider,
        state: StateStore,
        session_factory: Callable[[Update], SessionContext] = default_session,
    ) -> None:
        self._source = source
        self._pipeline = pipeline
        self._dispatcher = dispatcher
        self._publisher = publisher
        self._provider = provider
        self._state = state
        self._session_factory = session_factory

    async def pump(self) -> int:
        """Fetch one batch of updates and dispatch them. Returns the number handled."""
        handled = 0
        for raw in await self._source.fetch():
            update = self._pipeline.process(raw)
            ctx = HandlerContext(
                provider=self._provider, state=self._state, session=self._session_factory(update)
            )
            if await self._dispatcher.dispatch(update, ctx):
                handled += 1
        return handled

    async def publish(self, request: PublishRequest) -> PublishResult:
        return await self._publisher.publish(request)
