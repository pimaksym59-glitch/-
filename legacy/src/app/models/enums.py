"""Domain enums shared across models and business logic."""

from __future__ import annotations

import enum


class ChannelStatus(enum.StrEnum):
    active = "active"
    paused = "paused"
    disabled = "disabled"


class PostStatus(enum.StrEnum):
    draft = "draft"  # created, no content yet
    generating = "generating"  # AI pipeline running
    validated = "validated"  # passed validation layer
    queued = "queued"  # handed to Telegram publish queue
    published = "published"
    failed = "failed"
    rejected = "rejected"  # rejected by validation / review


class TaskStatus(enum.StrEnum):
    pending = "pending"  # created, dependencies not yet met
    ready = "ready"  # eligible to run
    running = "running"
    succeeded = "succeeded"
    failed = "failed"
    cancelled = "cancelled"


class TaskType(enum.StrEnum):
    generate_text = "generate_text"
    generate_image = "generate_image"
    validate = "validate"
    publish = "publish"
    collect_metrics = "collect_metrics"
