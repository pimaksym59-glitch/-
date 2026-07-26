"""Centralised, typed event taxonomy (owner req 3).

The single source of event names, categories and severities — call sites reference these enums
instead of string literals. Engagement events are ``GATED`` (§R7.3/§R11.1): available only with a
stats adapter (RV-16); the reliable internal categories (cost/quality/system/content-diversity)
are always available.

"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from enum import StrEnum


class EventSeverity(StrEnum):
    """Severity of an analytics event."""

    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class Availability(StrEnum):
    """Whether an event category is always available or gated behind an external adapter (§R7.3)."""

    ALWAYS = "always"
    GATED = "gated"


class EventCategory(StrEnum):
    """Top-level analytics categories (§R11.1). Engagement is gated; the rest always internal."""

    COST = "cost"
    QUALITY = "quality"
    SYSTEM = "system"
    CONTENT_DIVERSITY = "content_diversity"
    PIPELINE = "pipeline"
    AUDIT = "audit"
    ENGAGEMENT = "engagement"


class EventName(StrEnum):
    """Typed catalogue of known event names (owner req 3 — no scattered string literals)."""

    # cost (§R11.8)
    LLM_CALL_COMPLETED = "cost.llm_call_completed"
    IMAGE_CALL_COMPLETED = "cost.image_call_completed"
    # quality (§R5, §R11.7)
    VALIDATION_COMPLETED = "quality.validation_completed"
    CONTENT_REWRITTEN = "quality.content_rewritten"
    # system (§R12.9)
    TASK_STARTED = "system.task_started"
    TASK_FAILED = "system.task_failed"
    # content diversity (§R6, §R11.7)
    DUPLICATE_DETECTED = "content_diversity.duplicate_detected"
    IMAGE_REGENERATED = "content_diversity.image_regenerated"
    # pipeline
    PIPELINE_STAGE_COMPLETED = "pipeline.stage_completed"
    # engagement — GATED (§R7.3, §R11.3)
    POST_VIEWS_SAMPLED = "engagement.post_views_sampled"
    SUBSCRIBER_DELTA = "engagement.subscriber_delta"


@dataclass(frozen=True, slots=True)
class EventDescriptor:
    """Immutable taxonomy entry: an event's category, default severity and availability."""

    name: EventName
    category: EventCategory
    default_severity: EventSeverity
    availability: Availability


DEFAULT_DESCRIPTORS: tuple[EventDescriptor, ...] = (
    EventDescriptor(
        EventName.LLM_CALL_COMPLETED, EventCategory.COST, EventSeverity.INFO, Availability.ALWAYS
    ),
    EventDescriptor(
        EventName.IMAGE_CALL_COMPLETED, EventCategory.COST, EventSeverity.INFO, Availability.ALWAYS
    ),
    EventDescriptor(
        EventName.VALIDATION_COMPLETED,
        EventCategory.QUALITY,
        EventSeverity.INFO,
        Availability.ALWAYS,
    ),
    EventDescriptor(
        EventName.CONTENT_REWRITTEN,
        EventCategory.QUALITY,
        EventSeverity.WARNING,
        Availability.ALWAYS,
    ),
    EventDescriptor(
        EventName.TASK_STARTED, EventCategory.SYSTEM, EventSeverity.INFO, Availability.ALWAYS
    ),
    EventDescriptor(
        EventName.TASK_FAILED, EventCategory.SYSTEM, EventSeverity.ERROR, Availability.ALWAYS
    ),
    EventDescriptor(
        EventName.DUPLICATE_DETECTED,
        EventCategory.CONTENT_DIVERSITY,
        EventSeverity.WARNING,
        Availability.ALWAYS,
    ),
    EventDescriptor(
        EventName.IMAGE_REGENERATED,
        EventCategory.CONTENT_DIVERSITY,
        EventSeverity.INFO,
        Availability.ALWAYS,
    ),
    EventDescriptor(
        EventName.PIPELINE_STAGE_COMPLETED,
        EventCategory.PIPELINE,
        EventSeverity.INFO,
        Availability.ALWAYS,
    ),
    EventDescriptor(
        EventName.POST_VIEWS_SAMPLED,
        EventCategory.ENGAGEMENT,
        EventSeverity.INFO,
        Availability.GATED,
    ),
    EventDescriptor(
        EventName.SUBSCRIBER_DELTA,
        EventCategory.ENGAGEMENT,
        EventSeverity.INFO,
        Availability.GATED,
    ),
)


def default_descriptors() -> Iterable[EventDescriptor]:
    """Return the built-in taxonomy catalogue (registered by default in composition)."""

    return DEFAULT_DESCRIPTORS
