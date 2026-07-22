"""Task handler for TaskType.generate_text — the pipeline entry point.

Loads the channel and its persona, runs the generation pipeline, persists a
Post (status `validated`), and enqueues the next pipeline task (image
generation) referencing the new post.
"""

from __future__ import annotations

import structlog

from app.models import Channel, Persona, Post
from app.models.enums import PostStatus, TaskType
from memory.embeddings import get_embedder
from memory.retrieval import retrieve_context_for_channel
from scheduler import queue
from scheduler.registry import TaskContext

from .client import get_llm_client
from .pipeline import run_pipeline

log = structlog.get_logger(__name__)


async def handle_generate_text(task, ctx: TaskContext) -> dict:
    channel_id = task.payload.get("channel_id")
    topic = task.payload.get("topic")
    if channel_id is None:
        raise ValueError("generate_text task requires payload.channel_id")

    async with ctx.sessionmaker() as session:
        channel = await session.get(Channel, channel_id)
        if channel is None:
            raise ValueError(f"channel {channel_id} not found")
        persona = await session.get(Persona, channel.persona_id) if channel.persona_id else None
        channel_title = channel.title
        persona_id = persona.id if persona else None
        persona_system = persona.system_prompt if persona else None
        tone = persona.tone if persona else None
        language = persona.language if persona else "ru"

        # RAG: pull relevant knowledge for this channel (empty if none attached).
        embedder = get_embedder(ctx.settings)
        context = await retrieve_context_for_channel(
            session,
            channel_id=channel_id,
            query=topic or channel_title,
            embedder=embedder,
            top_k=ctx.settings.rag_top_k,
        )

    llm = get_llm_client(ctx.settings)
    content = await run_pipeline(
        llm,
        channel_title=channel_title,
        persona_system=persona_system,
        tone=tone,
        language=language,
        topic=topic,
        context=context,
    )

    async with ctx.sessionmaker() as session:
        post = Post(
            channel_id=channel_id,
            persona_id=persona_id,
            title=content.title,
            body=content.body,
            status=PostStatus.validated,
        )
        session.add(post)
        await session.commit()
        await session.refresh(post)
        post_id = post.id

    async with ctx.sessionmaker() as session:
        await queue.enqueue(
            session,
            task_type=TaskType.generate_image,
            payload={"post_id": post_id, "channel_id": channel_id},
        )

    log.info("generated_post", post_id=post_id, channel_id=channel_id)
    return {"post_id": post_id}
