"""PostgreSQL enum types (§R4.11-R4.13). Member value == stored value (lowercase snake_case)."""

from __future__ import annotations

from collections.abc import Sequence
from enum import StrEnum

from sqlalchemy import Enum as SAEnum


def pg_enum[E: StrEnum](enum_cls: type[E], name: str) -> SAEnum:
    """Native PostgreSQL enum bound to a StrEnum, stored by value."""

    def values(cls: type[E]) -> Sequence[str]:
        return [member.value for member in cls]

    return SAEnum(enum_cls, name=name, native_enum=True, values_callable=values)


class ChannelStatus(StrEnum):
    active = "active"
    paused = "paused"
    archived = "archived"


class PostStatus(StrEnum):
    draft = "draft"
    validating = "validating"
    rewriting = "rewriting"
    ready = "ready"
    scheduled = "scheduled"
    published = "published"
    failed = "failed"
    needs_review = "needs_review"


class TaskType(StrEnum):
    generate_text = "generate_text"
    validate = "validate"
    generate_image = "generate_image"
    publish = "publish"
    collect_metrics = "collect_metrics"
    backup = "backup"
    cleanup = "cleanup"
    reindex = "reindex"
    health_check = "health_check"


class TaskStatus(StrEnum):
    pending = "pending"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"
    deferred = "deferred"
    needs_review = "needs_review"
    cancelled = "cancelled"
    dead = "dead"


class UserRole(StrEnum):
    owner = "owner"
    admin = "admin"
    editor = "editor"
    analyst = "analyst"
    viewer = "viewer"


class MemoryKind(StrEnum):
    published_post = "published_post"
    example = "example"
    note = "note"


class SeverityLevel(StrEnum):
    debug = "debug"
    info = "info"
    warning = "warning"
    error = "error"
    critical = "critical"


class PromptType(StrEnum):
    system = "system"
    image = "image"
    negative = "negative"
    sales = "sales"
    story = "story"
    morning = "morning"
    evening = "evening"
    other = "other"


# Shared native-enum type objects — ONE per PG type so create_all emits CREATE TYPE once even when
# the enum is used by several tables (e.g. task_type: schedules+tasks; severity_level: errors+logs).
CHANNEL_STATUS = pg_enum(ChannelStatus, "channel_status")
POST_STATUS = pg_enum(PostStatus, "post_status")
TASK_TYPE = pg_enum(TaskType, "task_type")
TASK_STATUS = pg_enum(TaskStatus, "task_status")
USER_ROLE = pg_enum(UserRole, "user_role")
MEMORY_KIND = pg_enum(MemoryKind, "memory_kind")
SEVERITY_LEVEL = pg_enum(SeverityLevel, "severity_level")
PROMPT_TYPE = pg_enum(PromptType, "prompt_type")
