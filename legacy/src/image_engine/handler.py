"""Task handler for TaskType.generate_image.

Loads the Post, generates an image (retrying with a different scene to escape
near-duplicates of recent posts), stores the file, records the path + aHash, and
enqueues the next pipeline step (validation).
"""

from __future__ import annotations

import structlog
from sqlalchemy import select

from app.models import Post
from app.models.enums import TaskType
from scheduler import queue
from scheduler.registry import TaskContext

from .prompting import build_image_prompt
from .provider import get_image_provider
from .similarity import average_hash, is_duplicate
from .storage import save_image

log = structlog.get_logger(__name__)

_RECENT_LIMIT = 20


async def _recent_hashes(session, channel_id: int, exclude_post_id: int) -> list[int]:
    rows = await session.execute(
        select(Post.meta)
        .where(Post.channel_id == channel_id, Post.id != exclude_post_id)
        .order_by(Post.id.desc())
        .limit(_RECENT_LIMIT)
    )
    hashes: list[int] = []
    for (meta,) in rows.all():
        value = (meta or {}).get("image_ahash")
        if isinstance(value, int):
            hashes.append(value)
    return hashes


async def handle_generate_image(task, ctx: TaskContext) -> dict:
    post_id = task.payload.get("post_id")
    if post_id is None:
        raise ValueError("generate_image task requires payload.post_id")

    async with ctx.sessionmaker() as session:
        post = await session.get(Post, post_id)
        if post is None:
            raise ValueError(f"post {post_id} not found")
        title, body, channel_id = post.title, post.body, post.channel_id
        recent = await _recent_hashes(session, channel_id, post_id)

    provider = get_image_provider(ctx.settings)
    threshold = ctx.settings.image_similarity_threshold

    prompt = ""
    image: bytes = b""
    ahash = 0
    for attempt in range(ctx.settings.image_max_regen):
        prompt = build_image_prompt(title=title, body=body, seed=attempt)
        image = await provider.generate(prompt)
        ahash = average_hash(image)
        if not is_duplicate(ahash, recent, threshold=threshold):
            break
        log.info("image_near_duplicate_retry", post_id=post_id, attempt=attempt)

    path = save_image(image, media_root=ctx.settings.media_root)

    async with ctx.sessionmaker() as session:
        post = await session.get(Post, post_id)
        if post is None:
            raise ValueError(f"post {post_id} disappeared")
        post.image_path = path
        post.image_prompt = prompt
        post.meta = {**(post.meta or {}), "image_ahash": ahash}
        await session.commit()

    async with ctx.sessionmaker() as session:
        await queue.enqueue(session, task_type=TaskType.validate, payload={"post_id": post_id})

    log.info("generated_image", post_id=post_id, path=path)
    return {"post_id": post_id, "image_path": path}
