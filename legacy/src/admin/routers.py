"""Admin REST API — management surface over the platform modules.

All routes require the admin token (applied as a router-level dependency).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from analytics.service import build_channel_report
from app.config import get_settings
from app.db import get_session
from app.models import (
    Channel,
    KnowledgeBase,
    KnowledgeDocument,
    Persona,
    Post,
    Schedule,
    Task,
)
from app.models.enums import TaskStatus, TaskType
from memory.embeddings import get_embedder
from memory.ingest import ingest_document
from scheduler import queue

from . import schemas
from .security import require_admin

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


async def _get_or_404(session: AsyncSession, model, obj_id: int):
    obj = await session.get(model, obj_id)
    if obj is None:
        raise HTTPException(status_code=404, detail=f"{model.__name__} {obj_id} not found")
    return obj


# ── Personas ─────────────────────────────────────────────────────────────
@router.post("/personas", response_model=schemas.PersonaOut, status_code=201)
async def create_persona(body: schemas.PersonaIn, session: AsyncSession = Depends(get_session)):
    persona = Persona(**body.model_dump())
    session.add(persona)
    await session.commit()
    await session.refresh(persona)
    return persona


@router.get("/personas", response_model=list[schemas.PersonaOut])
async def list_personas(session: AsyncSession = Depends(get_session)):
    return (await session.execute(select(Persona).order_by(Persona.id))).scalars().all()


# ── Channels ─────────────────────────────────────────────────────────────
@router.post("/channels", response_model=schemas.ChannelOut, status_code=201)
async def create_channel(body: schemas.ChannelIn, session: AsyncSession = Depends(get_session)):
    channel = Channel(**body.model_dump())
    session.add(channel)
    await session.commit()
    await session.refresh(channel)
    return channel


@router.get("/channels", response_model=list[schemas.ChannelOut])
async def list_channels(session: AsyncSession = Depends(get_session)):
    return (await session.execute(select(Channel).order_by(Channel.id))).scalars().all()


@router.get("/channels/{channel_id}", response_model=schemas.ChannelOut)
async def get_channel(channel_id: int, session: AsyncSession = Depends(get_session)):
    return await _get_or_404(session, Channel, channel_id)


@router.post("/channels/{channel_id}/knowledge-bases/{kb_id}", status_code=204)
async def attach_knowledge_base(
    channel_id: int, kb_id: int, session: AsyncSession = Depends(get_session)
):
    channel = await _get_or_404(session, Channel, channel_id)
    kb = await _get_or_404(session, KnowledgeBase, kb_id)
    existing = await session.execute(
        select(KnowledgeBase.id)
        .join(Channel.knowledge_bases)
        .where(Channel.id == channel_id, KnowledgeBase.id == kb_id)
    )
    if existing.first() is None:
        channel.knowledge_bases.append(kb)
        await session.commit()


@router.post("/channels/{channel_id}/generate", response_model=schemas.EnqueuedTask)
async def trigger_generation(
    channel_id: int,
    body: schemas.GenerateIn,
    session: AsyncSession = Depends(get_session),
):
    await _get_or_404(session, Channel, channel_id)
    payload: dict = {"channel_id": channel_id}
    if body.topic:
        payload["topic"] = body.topic
    task = await queue.enqueue(session, task_type=TaskType.generate_text, payload=payload)
    return schemas.EnqueuedTask(task_id=task.id)


@router.get("/channels/{channel_id}/posts", response_model=list[schemas.PostOut])
async def list_posts(
    channel_id: int,
    limit: int = Query(50, le=200),
    session: AsyncSession = Depends(get_session),
):
    rows = await session.execute(
        select(Post).where(Post.channel_id == channel_id).order_by(Post.id.desc()).limit(limit)
    )
    return rows.scalars().all()


@router.get("/channels/{channel_id}/analytics", response_model=schemas.AnalyticsOut)
async def channel_analytics(channel_id: int, session: AsyncSession = Depends(get_session)):
    await _get_or_404(session, Channel, channel_id)
    result = await build_channel_report(session, channel_id)
    r = result.report
    return schemas.AnalyticsOut(
        total_posts=r.total_posts,
        total_views=r.total_views,
        total_reactions=r.total_reactions,
        total_forwards=r.total_forwards,
        avg_engagement=r.avg_engagement,
        best_hour=r.best_hour,
        top_posts=[
            schemas.TopPost(post_id=p.post_id, title=p.title, engagement=p.engagement)
            for p in r.top_posts
        ],
        recommendations=result.recommendations,
    )


# ── Schedules ────────────────────────────────────────────────────────────
@router.post(
    "/channels/{channel_id}/schedules", response_model=schemas.ScheduleOut, status_code=201
)
async def create_schedule(
    channel_id: int, body: schemas.ScheduleIn, session: AsyncSession = Depends(get_session)
):
    await _get_or_404(session, Channel, channel_id)
    schedule = Schedule(channel_id=channel_id, **body.model_dump())
    session.add(schedule)
    await session.commit()
    await session.refresh(schedule)
    return schedule


# ── Knowledge bases ──────────────────────────────────────────────────────
@router.post("/knowledge-bases", response_model=schemas.KnowledgeBaseOut, status_code=201)
async def create_knowledge_base(
    body: schemas.KnowledgeBaseIn, session: AsyncSession = Depends(get_session)
):
    kb = KnowledgeBase(**body.model_dump())
    session.add(kb)
    await session.commit()
    await session.refresh(kb)
    return kb


@router.get("/knowledge-bases", response_model=list[schemas.KnowledgeBaseOut])
async def list_knowledge_bases(session: AsyncSession = Depends(get_session)):
    return (await session.execute(select(KnowledgeBase).order_by(KnowledgeBase.id))).scalars().all()


@router.post(
    "/knowledge-bases/{kb_id}/documents", response_model=schemas.IngestResult, status_code=201
)
async def add_document(
    kb_id: int, body: schemas.DocumentIn, session: AsyncSession = Depends(get_session)
):
    await _get_or_404(session, KnowledgeBase, kb_id)
    doc = KnowledgeDocument(knowledge_base_id=kb_id, **body.model_dump())
    session.add(doc)
    await session.commit()
    await session.refresh(doc)
    embedder = get_embedder(get_settings())
    chunks = await ingest_document(session, doc.id, embedder)
    return schemas.IngestResult(document_id=doc.id, chunks=chunks)


# ── Tasks (monitoring) ───────────────────────────────────────────────────
@router.get("/tasks", response_model=list[schemas.TaskOut])
async def list_tasks(
    status: TaskStatus | None = None,
    limit: int = Query(50, le=200),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Task).order_by(Task.id.desc()).limit(limit)
    if status is not None:
        stmt = stmt.where(Task.status == status)
    return (await session.execute(stmt)).scalars().all()
