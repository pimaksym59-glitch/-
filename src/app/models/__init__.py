"""Central data layer. Importing this package registers every table on
`Base.metadata`, so Alembic (and `Base.metadata.create_all`) see the full schema.
"""

from __future__ import annotations

from .analytics import PostMetric
from .base import Base, TimestampMixin
from .channel import Channel, Persona, channel_knowledge_bases
from .content import Post
from .enums import ChannelStatus, PostStatus, TaskStatus, TaskType
from .knowledge import EMBEDDING_DIM, KnowledgeBase, KnowledgeChunk, KnowledgeDocument
from .scheduling import Schedule, Task

__all__ = [
    "Base",
    "TimestampMixin",
    "Channel",
    "Persona",
    "channel_knowledge_bases",
    "Post",
    "KnowledgeBase",
    "KnowledgeDocument",
    "KnowledgeChunk",
    "EMBEDDING_DIM",
    "Schedule",
    "Task",
    "PostMetric",
    "ChannelStatus",
    "PostStatus",
    "TaskStatus",
    "TaskType",
]
