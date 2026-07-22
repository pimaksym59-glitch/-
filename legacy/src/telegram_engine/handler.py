"""Task handler for TaskType.publish.

Loads the Post and its channel, sends a photo-with-caption (if an image exists
on disk) or a text message, records telegram_message_id / published_at / status,
and schedules metrics collection. Send failures propagate so the scheduler
retries with backoff.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path

import structlog

from app.models import Channel, Post
from app.models.enums import PostStatus, TaskType
from scheduler import queue
from scheduler.registry import TaskContext

from .client import get_telegram_client
from .formatting import render_message

log = structlog.get_logger(__name__)


async def handle_publish(task, ctx: TaskContext) -> dict:
    post_id = task.payload.get("post_id")
    if post_id is None:
        raise ValueError("publish task requires payload.post_id")

    async with ctx.sessionmaker() as session:
        post = await session.get(Post, post_id)
        if post is None:
            raise ValueError(f"post {post_id} not found")
        channel = await session.get(Channel, post.channel_id)
        if channel is None:
            raise ValueError(f"channel {post.channel_id} not found")
        body, image_path = post.body, post.image_path
        chat_id = channel.telegram_chat_id

    abs_image: str | None = None
    if image_path:
        candidate = Path(ctx.settings.media_root) / image_path
        if candidate.is_file():
            abs_image = str(candidate)

    text = render_message(body, has_image=abs_image is not None)

    client = get_telegram_client(ctx.settings)
    try:
        if abs_image:
            message_id = await client.send_photo(
                chat_id=chat_id, photo_path=abs_image, caption=text
            )
        else:
            message_id = await client.send_message(chat_id=chat_id, text=text)
    finally:
        await client.aclose()

    published_at = datetime.now(tz=UTC)
    async with ctx.sessionmaker() as session:
        post = await session.get(Post, post_id)
        if post is None:
            raise ValueError(f"post {post_id} disappeared")
        post.telegram_message_id = message_id
        post.published_at = published_at
        post.status = PostStatus.published
        post.error = None
        await session.commit()

    async with ctx.sessionmaker() as session:
        await queue.enqueue(
            session,
            task_type=TaskType.collect_metrics,
            payload={"post_id": post_id},
            available_at=published_at + timedelta(seconds=ctx.settings.metrics_delay_seconds),
        )

    log.info("published_post", post_id=post_id, message_id=message_id)
    return {"post_id": post_id, "message_id": message_id}
