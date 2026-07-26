"""Batch generation integration point (owner req 13) — **seam only, not implemented**. A real batch
generator implements this Protocol later; the Image Engine exposes single-image generation for now.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

from app.images.types import GeneratedImage, ImageRequest


class BatchGenerator(Protocol):
    async def generate_batch(self, requests: Sequence[ImageRequest]) -> list[GeneratedImage]: ...
