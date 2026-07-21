"""Task handler for TaskType.collect_metrics — the final pipeline step.

Fetches a metric snapshot for a published post and appends it to post_metrics.
Skips posts that were never published (no telegram_message_id).
"""

from __future__ import annotations

from datetime import UTC, datetime

import structlog

from app.models import Channel, Post, PostMetric
from scheduler.registry import TaskContext

from .metrics_provider import get_metrics_provider

log = structlog.get_logger(__name__)


async def handle_collect_metrics(task, ctx: TaskContext) -> dict:
    post_id = task.payload.get("post_id")
    if post_id is None:
        raise ValueError("collect_metrics task requires payload.post_id")

    async with ctx.sessionmaker() as session:
        post = await session.get(Post, post_id)
        if post is None:
            raise ValueError(f"post {post_id} not found")
        if post.telegram_message_id is None:
            log.info("metrics_skipped_unpublished", post_id=post_id)
            return {"post_id": post_id, "skipped": "not published"}
        channel = await session.get(Channel, post.channel_id)
        chat_id = channel.telegram_chat_id if channel else ""
        message_id = post.telegram_message_id

    provider = get_metrics_provider(ctx.settings)
    snapshot = await provider.fetch(chat_id=chat_id, message_id=message_id)

    async with ctx.sessionmaker() as session:
        session.add(
            PostMetric(
                post_id=post_id,
                views=snapshot.views,
                reactions=snapshot.reactions,
                forwards=snapshot.forwards,
                captured_at=datetime.now(tz=UTC),
            )
        )
        await session.commit()

    log.info("metrics_collected", post_id=post_id, views=snapshot.views)
    return {
        "post_id": post_id,
        "views": snapshot.views,
        "reactions": snapshot.reactions,
        "forwards": snapshot.forwards,
    }
