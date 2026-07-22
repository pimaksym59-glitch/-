"""Task handler for TaskType.validate — the pre-publication gate.

Runs the validation rules against a Post. On pass: status → queued and a
`publish` task is enqueued (closing the pipeline). On fail: status → rejected
with the issues recorded; nothing is published.
"""

from __future__ import annotations

from pathlib import Path

import structlog
from sqlalchemy import select

from app.models import Post
from app.models.enums import PostStatus, TaskType
from scheduler import queue
from scheduler.registry import TaskContext

from .validator import validate_post

log = structlog.get_logger(__name__)

_RECENT_LIMIT = 20


async def _recent_bodies(session, channel_id: int, exclude_post_id: int) -> list[str]:
    rows = await session.execute(
        select(Post.body)
        .where(
            Post.channel_id == channel_id,
            Post.id != exclude_post_id,
            Post.status == PostStatus.published,
        )
        .order_by(Post.id.desc())
        .limit(_RECENT_LIMIT)
    )
    return [body for (body,) in rows.all() if body]


async def handle_validate(task, ctx: TaskContext) -> dict:
    post_id = task.payload.get("post_id")
    if post_id is None:
        raise ValueError("validate task requires payload.post_id")

    async with ctx.sessionmaker() as session:
        post = await session.get(Post, post_id)
        if post is None:
            raise ValueError(f"post {post_id} not found")
        body, image_path, channel_id = post.body, post.image_path, post.channel_id
        recent = await _recent_bodies(session, channel_id, post_id)

    image_exists = bool(image_path and (Path(ctx.settings.media_root) / image_path).is_file())

    result = validate_post(
        body=body,
        image_path=image_path,
        image_exists=image_exists,
        recent_bodies=recent,
        min_chars=ctx.settings.validation_min_chars,
        max_chars=ctx.settings.validation_max_chars,
        banned_patterns=ctx.settings.validation_banned_patterns,
        duplicate_threshold=ctx.settings.validation_duplicate_threshold,
    )

    async with ctx.sessionmaker() as session:
        post = await session.get(Post, post_id)
        if post is None:
            raise ValueError(f"post {post_id} disappeared")
        if result.ok:
            post.status = PostStatus.queued
            post.error = None
        else:
            post.status = PostStatus.rejected
            post.error = "; ".join(result.issues)[:4000]
        await session.commit()

    if result.ok:
        async with ctx.sessionmaker() as session:
            await queue.enqueue(session, task_type=TaskType.publish, payload={"post_id": post_id})
        log.info("validation_passed", post_id=post_id)
    else:
        log.warning("validation_rejected", post_id=post_id, issues=result.issues)

    return {"post_id": post_id, "ok": result.ok, "issues": result.issues}
