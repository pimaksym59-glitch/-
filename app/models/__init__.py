"""ORM models — single home (§R3.2). Importing this package registers every table on
``Base.metadata`` (the Alembic autogenerate target)."""

from __future__ import annotations

from app.db.base import Base
from app.models.analytics import (
    AnalyticsSnapshot,
    ApiUsage,
    ErrorLog,
    ImageUsage,
    SystemLog,
)
from app.models.base import Entity, Record
from app.models.channel import Actor, Channel, ChannelSettings, Location, Persona
from app.models.content import Cta, Post, PostHistory, Prompt, Schedule, Topic
from app.models.image import Image, ImageHistory
from app.models.knowledge import Document, DocumentChunk
from app.models.memory import Memory
from app.models.queue import Task
from app.models.user import AuditLog, ConfigVersion, User

__all__ = [
    "Actor",
    "AnalyticsSnapshot",
    "ApiUsage",
    "AuditLog",
    "Base",
    "Channel",
    "ChannelSettings",
    "ConfigVersion",
    "Cta",
    "Document",
    "DocumentChunk",
    "Entity",
    "ErrorLog",
    "Image",
    "ImageHistory",
    "ImageUsage",
    "Location",
    "Memory",
    "Persona",
    "Post",
    "PostHistory",
    "Prompt",
    "Record",
    "Schedule",
    "SystemLog",
    "Task",
    "Topic",
    "User",
]
