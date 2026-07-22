"""Text-generation pipeline: generate → self-review → humanize → validate.

Each stage is one LLM call; validation here is a light guard (non-empty, within
length bounds). The full Validation layer arrives in Stage 8.
"""

from __future__ import annotations

from dataclasses import dataclass

from .client import LLMClient
from .prompts import (
    build_system,
    generate_prompt,
    humanize_prompt,
    self_review_prompt,
)

# Telegram hard limit for a text message is 4096 chars; leave headroom.
MAX_BODY_CHARS = 3800


@dataclass
class GeneratedContent:
    title: str | None
    body: str


class ContentValidationError(ValueError):
    """Raised when generated content fails the light pre-publication guard."""


def validate(body: str) -> None:
    stripped = body.strip()
    if not stripped:
        raise ContentValidationError("empty body")
    if len(stripped) > MAX_BODY_CHARS:
        raise ContentValidationError(f"body too long ({len(stripped)} > {MAX_BODY_CHARS})")


def _derive_title(body: str) -> str | None:
    first_line = body.strip().splitlines()[0].strip() if body.strip() else ""
    if 0 < len(first_line) <= 120:
        return first_line
    return None


async def run_pipeline(
    llm: LLMClient,
    *,
    channel_title: str,
    persona_system: str | None,
    tone: str | None,
    language: str,
    topic: str | None = None,
    context: str | None = None,
) -> GeneratedContent:
    system = build_system(persona_system=persona_system, tone=tone, language=language)

    draft = await llm.complete(
        system=system,
        user=generate_prompt(channel_title=channel_title, topic=topic, context=context),
    )
    reviewed = await llm.complete(system=system, user=self_review_prompt(draft=draft))
    humanized = await llm.complete(system=system, user=humanize_prompt(draft=reviewed))

    body = humanized.strip()
    validate(body)
    return GeneratedContent(title=_derive_title(body), body=body)
