"""Memory DTOs (§R9.1/§R9.12) — immutable. Memory levels are scope **data**, not logic (owner req
15).
Style Memory stores **features, not texts** (§R9.12).
"""

from __future__ import annotations

import uuid
from collections.abc import Mapping
from dataclasses import dataclass, field
from enum import StrEnum


class MemoryScope(StrEnum):
    """Memory levels (§R9.1). ``global_`` is cross-channel (the single Global memory)."""

    content = "content"
    persona = "persona"
    channel = "channel"
    global_ = "global"


@dataclass(frozen=True, slots=True)
class MemoryEntry:
    id: uuid.UUID
    channel_id: uuid.UUID | None  # None => global scope (§R9.1)
    scope: MemoryScope
    kind: str  # published_post | example | note
    text: str
    embedding: tuple[float, ...] | None = None


@dataclass(frozen=True, slots=True)
class StyleFeatures:
    """Style-memory features (§R9.12): sentence lengths, dialogue frequency, etc. — never texts."""

    channel_id: uuid.UUID
    features: Mapping[str, float] = field(default_factory=dict)
