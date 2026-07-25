"""Deterministic, offline image fake (§R2.10, owner req 11). Produces a real (tiny) PNG whose solid
colour is a pure function of the prompt — no randomness, no network. Uses Pillow (already a project
dependency). No business logic.
"""

from __future__ import annotations

import hashlib
import io

from PIL import Image

from app.core.providers.base import Capability, ProviderKind
from app.core.providers.health import ProviderHealth
from app.core.providers.registry import FAKE_NAME
from app.images.base import ImageResult


class FakeImageProvider:
    """Renders a deterministic solid-colour PNG from the prompt. Records prompts for assertions."""

    name = FAKE_NAME
    kind = ProviderKind.image

    def __init__(self) -> None:
        self.prompts: list[str] = []

    def capabilities(self) -> frozenset[Capability]:
        return frozenset({Capability.image_generation, Capability.image_identity_reference})

    async def health(self) -> ProviderHealth:
        return ProviderHealth(healthy=True)

    async def generate(self, prompt: str, *, size: tuple[int, int] = (512, 512)) -> ImageResult:
        self.prompts.append(prompt)
        image = Image.new("RGB", size, self._colour(prompt))
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        return ImageResult(data=buffer.getvalue(), mime="image/png", width=size[0], height=size[1])

    def _colour(self, prompt: str) -> tuple[int, int, int]:
        digest = hashlib.sha256(prompt.encode("utf-8")).digest()
        return (digest[0], digest[1], digest[2])
