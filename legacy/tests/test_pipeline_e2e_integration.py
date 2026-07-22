"""End-to-end pipeline: enqueue generate_text and drain the queue to a published
post, using the fake providers (no external API keys).

Skipped unless RUN_INTEGRATION=1 with a migrated Postgres + Redis running.
"""

import os
import uuid

import pytest

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_INTEGRATION") != "1",
    reason="set RUN_INTEGRATION=1 with a migrated Postgres running",
)


async def test_generate_to_published():
    from sqlalchemy import select

    import ai_engine
    import analytics
    import image_engine
    import telegram_engine
    import validation
    from app.config import get_settings
    from app.db import get_sessionmaker
    from app.models import Channel, Persona, Post
    from app.models.enums import PostStatus, TaskType
    from scheduler import queue
    from scheduler.registry import TaskContext, clear_handlers, get_handler

    clear_handlers()
    for engine in (ai_engine, image_engine, validation, telegram_engine, analytics):
        engine.register()

    settings = get_settings()  # no API keys → fake LLM/image/telegram/metrics
    sm = get_sessionmaker()

    async with sm() as session:
        persona = Persona(name="e2e", system_prompt="Be concise and friendly.", language="en")
        session.add(persona)
        await session.flush()
        channel = Channel(
            title="E2E Channel",
            telegram_chat_id=f"@e2e_{uuid.uuid4().hex[:8]}",
            persona_id=persona.id,
        )
        session.add(channel)
        await session.commit()
        channel_id = channel.id

    async with sm() as session:
        await queue.enqueue(
            session, task_type=TaskType.generate_text, payload={"channel_id": channel_id}
        )

    ctx = TaskContext(sm, settings)
    # Drain runnable tasks. collect_metrics is scheduled in the future
    # (metrics_delay_seconds), so the loop naturally stops after publish.
    for _ in range(25):
        async with sm() as session:
            task = await queue.claim_next(session)
            if task is None:
                break
            handler = get_handler(task.type)
            try:
                result = await handler(task, ctx)
                await queue.mark_succeeded(
                    session, task, result if isinstance(result, dict) else None
                )
            except Exception as exc:  # noqa: BLE001
                await queue.mark_failed_or_retry(session, task, repr(exc))

    async with sm() as session:
        posts = (
            (await session.execute(select(Post).where(Post.channel_id == channel_id)))
            .scalars()
            .all()
        )
    published = [p for p in posts if p.status == PostStatus.published]
    assert published, f"no published post; statuses={[p.status for p in posts]}"
    assert published[0].telegram_message_id is not None
    assert published[0].image_path  # image was generated and attached
