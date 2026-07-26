"""Outbound publishing (§R7.8) — sends a post via the Stage-11 ``TelegramProvider`` in the right
mode
(text / photo / album). It composes the formatter, the attachment pipeline, the rate limiter (port),
the idempotency layer and the error-recovery pipeline. Idempotency marks the ``dedup_key``
**before**
sending (at-least-once, §R7.4); a send failure is surfaced as a structured ``PublishResult`` (the
queue
handler maps transient -> retry / permanent/ambiguous -> needs_review). No AI/Validation/Image
logic.
"""

from __future__ import annotations

from app.core.providers.errors import ProviderError
from app.telegram.attachments import AttachmentPipeline
from app.telegram.base import SendResult, TelegramProvider
from app.telegram.formatter import escape, truncate_caption, truncate_text
from app.telegram.idempotency import IdempotencyGuard
from app.telegram.ratelimit import RateLimiter, rate_limit_key
from app.telegram.recovery import ErrorRecoveryPipeline, RecoveryOutcome
from app.telegram.types import Attachment, PublishRequest, PublishResult


class PublishService:
    def __init__(
        self,
        provider: TelegramProvider,
        *,
        idempotency: IdempotencyGuard,
        rate_limiter: RateLimiter,
        attachments: AttachmentPipeline | None = None,
        recovery: ErrorRecoveryPipeline | None = None,
        bot_token: str = "",
    ) -> None:
        self._provider = provider
        self._idempotency = idempotency
        self._rate_limiter = rate_limiter
        self._attachments = attachments if attachments is not None else AttachmentPipeline()
        self._recovery = recovery if recovery is not None else ErrorRecoveryPipeline()
        self._bot_token = bot_token

    async def publish(self, request: PublishRequest) -> PublishResult:
        if request.draft:
            return PublishResult(sent=False, status="draft")  # §R7.8 draft: no publish
        if await self._idempotency.seen(request.dedup_key):
            return PublishResult(sent=False, status="skipped", reason="duplicate")
        if not await self._rate_limiter.acquire(rate_limit_key(self._bot_token, request.chat_id)):
            return PublishResult(sent=False, status="needs_review", reason="rate_limited")

        attachments = self._attachments.process(request.attachments)
        text = truncate_text(escape(request.text, request.parse_mode))
        await self._idempotency.mark(request.dedup_key)  # §R7.4 mark BEFORE send (at-least-once)
        try:
            results = await self._send(request.chat_id, text, attachments)
        except ProviderError as exc:
            outcome = self._recovery.recover(exc, attempts=0)
            status = "failed" if outcome is RecoveryOutcome.retry else "needs_review"
            return PublishResult(sent=False, status=status, reason=f"{type(exc).__name__}: {exc}")
        return PublishResult(sent=True, message_ids=tuple(r.message_id for r in results))

    async def _send(
        self, chat_id: int | str, text: str, attachments: tuple[Attachment, ...]
    ) -> list[SendResult]:
        if not attachments:
            return [await self._provider.send_message(chat_id, text)]
        media = [item.data for item in attachments if item.data is not None]
        caption = truncate_caption(text) if text else None
        if len(attachments) == 1:
            photo = media[0] if media else b""
            return [await self._provider.send_photo(chat_id, photo, caption=caption)]
        return await self._provider.send_media_group(chat_id, media, caption=caption)
