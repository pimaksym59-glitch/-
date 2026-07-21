"""Pydantic request/response models for the admin API."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class _ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── Personas ─────────────────────────────────────────────────────────────
class PersonaIn(BaseModel):
    name: str
    system_prompt: str
    description: str | None = None
    tone: str | None = None
    language: str = "ru"


class PersonaOut(_ORM):
    id: int
    name: str
    tone: str | None
    language: str
    is_active: bool


# ── Channels ─────────────────────────────────────────────────────────────
class ChannelIn(BaseModel):
    title: str
    telegram_chat_id: str
    persona_id: int | None = None
    settings: dict = {}


class ChannelOut(_ORM):
    id: int
    title: str
    telegram_chat_id: str
    persona_id: int | None
    status: str


# ── Schedules ────────────────────────────────────────────────────────────
class ScheduleIn(BaseModel):
    cron: str | None = None
    interval_seconds: int | None = None
    timezone: str = "UTC"


class ScheduleOut(_ORM):
    id: int
    channel_id: int
    cron: str | None
    interval_seconds: int | None
    timezone: str
    is_active: bool
    next_run_at: datetime | None


# ── Knowledge base ───────────────────────────────────────────────────────
class KnowledgeBaseIn(BaseModel):
    name: str
    description: str | None = None


class KnowledgeBaseOut(_ORM):
    id: int
    name: str
    is_active: bool


class DocumentIn(BaseModel):
    title: str
    raw_text: str
    source: str | None = None


class IngestResult(BaseModel):
    document_id: int
    chunks: int


# ── Actions & views ──────────────────────────────────────────────────────
class GenerateIn(BaseModel):
    topic: str | None = None


class EnqueuedTask(BaseModel):
    task_id: int


class PostOut(_ORM):
    id: int
    channel_id: int
    title: str | None
    status: str
    image_path: str | None
    published_at: datetime | None
    created_at: datetime


class TaskOut(_ORM):
    id: int
    type: str
    status: str
    attempts: int
    available_at: datetime | None
    created_at: datetime


class TopPost(BaseModel):
    post_id: int
    title: str | None
    engagement: int


class AnalyticsOut(BaseModel):
    total_posts: int
    total_views: int
    total_reactions: int
    total_forwards: int
    avg_engagement: float
    best_hour: int | None
    top_posts: list[TopPost]
    recommendations: list[str]
