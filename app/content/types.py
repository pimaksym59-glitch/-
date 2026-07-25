"""AI Engine contracts (§R5) — pure data, no rules, no I/O. ``PromptSpec`` carries persona / style /
topic / constraints / examples **as data** (the caller supplies them); the engine encodes no content
rules itself (owner req 1/11). Roles drive model routing (§R5.10) independently of provider choice.
"""

from __future__ import annotations

import uuid
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from enum import StrEnum

from app.models.enums import PromptType


class Role(StrEnum):
    """Generation role — routed to a model tier (§R5.10). Not a content rule."""

    body = "body"
    headline = "headline"  # avoids shadowing str.title on StrEnum
    cta = "cta"
    theme = "theme"
    judge = "judge"


@dataclass(frozen=True, slots=True)
class PromptPart:
    """One labelled section of the assembled prompt (structure only — no model formatting)."""

    name: str
    body: str


@dataclass(frozen=True, slots=True)
class PromptSpec:
    """Everything needed to build a prompt — as data. No model knowledge, no business rules."""

    prompt_type: PromptType
    role: Role
    task: str  # the core instruction supplied by the caller (domain stage)
    persona: Mapping[str, str] = field(default_factory=dict)  # voice/style data
    topic: str | None = None
    constraints: Sequence[str] = ()  # e.g. forbidden_this_run — data, not logic
    examples: Sequence[str] = ()  # few-shot (persona.best_examples), K=3-5 (§R5.2)
    variables: Mapping[str, str] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class GenerationRequest:
    spec: PromptSpec
    channel_id: uuid.UUID | None = None
    max_context_tokens: int = 8000  # §R5.2 / §Appendix B; overridden from settings by composition
    max_rewrites: int = 3  # §R5.6 quality rewrites (NOT infra MAX_RETRIES)
    json_mode: bool = False


@dataclass(frozen=True, slots=True)
class Usage:
    model: str
    prompt_tokens: int
    completion_tokens: int


@dataclass(frozen=True, slots=True)
class GenerationResult:
    text: str
    model: str
    provider: str
    usage: Usage
    rewrites: int
    passed: bool
    issues: Sequence[str] = ()
