"""RAG DTOs (§R9) — storage-agnostic, immutable (owner req 11/12). These carry no ORM/pgvector
dependency: real stores map them to persistence later. ``Metadata`` is immutable; ``Document``,
``Chunk``, ``SearchResult`` and ``RetrievalContext`` are ``frozen`` dataclasses.
"""

from __future__ import annotations

import uuid
from collections.abc import Mapping
from dataclasses import dataclass, field


@dataclass(frozen=True, slots=True)
class Metadata:
    """Immutable chunk/document metadata used for hard-filtering (§R9.2/§R9.7)."""

    channel_id: uuid.UUID | None = None  # None => global (§R9.1)
    doc_type: str | None = None
    version: int = 1
    active: bool = True  # active version (§R9.10)
    tier: str = "active"  # retention tier: active|archive|purge (§R9.9)
    extra: Mapping[str, str] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class Document:
    id: uuid.UUID
    text: str
    metadata: Metadata


@dataclass(frozen=True, slots=True)
class Chunk:
    id: uuid.UUID
    document_id: uuid.UUID
    ordinal: int
    text: str
    metadata: Metadata
    embedding: tuple[float, ...] | None = None


@dataclass(frozen=True, slots=True)
class SearchFilter:
    """Hard filter applied *before* ranking (§R9.7). Channel isolation is mandatory (§R9.2)."""

    channel_id: uuid.UUID | None = None
    include_global: bool = True  # also match channel_id=None (global memory/KB, §R9.1)
    doc_type: str | None = None
    active_only: bool = True


@dataclass(frozen=True, slots=True)
class RetrievalQuery:
    text: str
    filter: SearchFilter
    limit: int = 5


@dataclass(frozen=True, slots=True)
class SearchResult:
    chunk: Chunk
    score: float


@dataclass(frozen=True, slots=True)
class RetrievalContext:
    """Observability snapshot of one retrieval (§R9.13)."""

    query: str
    results: tuple[SearchResult, ...]
    found: int
    used: int
    search_ms: float
    assembly_ms: float
    context_tokens: int
