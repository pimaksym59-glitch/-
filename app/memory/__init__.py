"""Domain: long-term memory (§R9), channel-isolated (WHERE channel_id, §R9.2). An independent
subsystem: it reuses the neutral RAG kernel but never imports Knowledge (owner req 8/9). It
implements
the Stage-12 ``MemoryContextSource`` port.
"""

from __future__ import annotations

from app.memory.source import MemoryRetriever
from app.memory.stores import FakeMemoryStore, MemoryStore
from app.memory.types import MemoryEntry, MemoryScope, StyleFeatures

__all__ = [
    "FakeMemoryStore",
    "MemoryEntry",
    "MemoryRetriever",
    "MemoryScope",
    "MemoryStore",
    "StyleFeatures",
]
