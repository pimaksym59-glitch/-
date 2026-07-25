"""Rule protocol + rule context (owner req 2/4). Every rule implements the same ``Rule`` Protocol;
the engine/registry never know concrete rule classes. ``RuleContext`` is immutable data (plus the
external-check ports) — rules read from it and return findings. ML-based validators integrate simply
by implementing ``Rule`` (owner req 13) — that is the extension point.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from dataclasses import dataclass, field
from typing import Protocol

from app.validators.models import Finding
from app.validators.ports import DuplicationChecker, HumannessScorer


@dataclass(frozen=True, slots=True)
class RuleContext:
    """Immutable input to a rule. Policy/persona data and recent texts are supplied by composition
    (recent texts + duplication checker come from the public Memory/RAG interfaces, owner req 8)."""

    text: str
    channel_id: uuid.UUID | None = None
    # policy data
    banned_words: Sequence[str] = ()
    allowed_topics: Sequence[str] = ()
    max_length: int | None = None
    # persona data
    forbidden_expressions: Sequence[str] = ()
    # thresholds
    similarity_threshold: float = 0.85
    humanness_min: int = 75
    # dedup: recent texts (cheap cascade stages) + semantic checker port (expensive stage)
    recent_texts: Sequence[str] = ()
    checker: DuplicationChecker | None = None
    scorer: HumannessScorer | None = None
    extra: dict[str, str] = field(default_factory=dict)


class Rule(Protocol):
    """A single validation rule. Deterministic; no text generation (owner req 8)."""

    name: str

    async def check(self, ctx: RuleContext) -> list[Finding]: ...
