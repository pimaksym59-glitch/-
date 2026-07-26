"""Image validation (§R6.7, owner req 11) — a public ``ImageValidator`` Protocol. The engine depends
only on this port, never a concrete implementation. The real validator (face/hands/eyes/artefacts/
realism and actor-match via face-embedding/CLIP, §R6.7) is Runtime Verification Pending (RV-14); a
deterministic fake is used offline. A failed validation drives regeneration (§R6.5).
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from typing import Protocol

from app.images.types import ImageMetadata


@dataclass(frozen=True, slots=True)
class ImageValidationResult:
    passed: bool
    issues: Sequence[str] = field(default_factory=tuple)


class ImageValidator(Protocol):
    async def validate(
        self, image: bytes, metadata: ImageMetadata, *, actor_refs: Sequence[str]
    ) -> ImageValidationResult: ...
