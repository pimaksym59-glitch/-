"""Provider base contracts (§R2.10, §R3.8) — generic, imports no domain package (dependencies flow
outward only). Every provider (LLM/Image/Embedding/Telegram/...) is a ``Provider``: it declares its
``kind``, its ``capabilities`` (declaratively — discovery never inspects class names, owner req 7),
and a non-networking ``health`` snapshot (owner req 8). Concrete per-kind protocols extend this in
the domain packages; fakes and real adapters implement them.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Protocol, runtime_checkable

from app.core.providers.health import ProviderHealth


class ProviderKind(StrEnum):
    llm = "llm"
    image = "image"
    embedding = "embedding"
    telegram = "telegram"
    metrics = "metrics"


class Capability(StrEnum):
    """Declared provider capabilities. Discovery checks membership, not the class (owner req 7)."""

    text_generation = "text_generation"
    json_mode = "json_mode"
    vision = "vision"
    embeddings = "embeddings"
    image_generation = "image_generation"
    image_identity_reference = "image_identity_reference"
    send_message = "send_message"
    send_photo = "send_photo"
    send_media_group = "send_media_group"


@runtime_checkable
class Provider(Protocol):
    """Structural contract common to every provider. ``name`` identifies the implementation
    (e.g. ``"fake"``, ``"anthropic"``); ``kind`` is its category."""

    name: str
    kind: ProviderKind

    def capabilities(self) -> frozenset[Capability]: ...

    async def health(self) -> ProviderHealth: ...
