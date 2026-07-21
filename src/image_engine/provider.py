"""Image provider abstraction.

`OpenAIImageProvider` calls the Images API; `FakeImageProvider` renders a
deterministic PNG derived from the prompt (different prompts → visibly different
images, so similarity checks are meaningful offline). `get_image_provider`
selects between them.
"""

from __future__ import annotations

import base64
import hashlib
import io
from typing import Protocol, runtime_checkable

from app.config import Settings


@runtime_checkable
class ImageProvider(Protocol):
    async def generate(self, prompt: str) -> bytes:
        """Return PNG image bytes for the prompt."""
        ...


class OpenAIImageProvider:
    def __init__(self, settings: Settings) -> None:
        from openai import AsyncOpenAI  # lazy: keep import light for tests/offline

        self._client = AsyncOpenAI(api_key=settings.image_api_key)
        self._model = settings.image_model
        self._size = settings.image_size

    async def generate(self, prompt: str) -> bytes:
        resp = await self._client.images.generate(
            model=self._model, prompt=prompt, size=self._size, n=1
        )
        return base64.b64decode(resp.data[0].b64_json)


class FakeImageProvider:
    """Deterministic 64x64 PNG whose pixels come from a hash of the prompt."""

    def __init__(self, size: int = 64) -> None:
        self._size = size

    async def generate(self, prompt: str) -> bytes:
        from PIL import Image

        seed = hashlib.sha256(prompt.encode("utf-8")).digest()
        img = Image.new("RGB", (self._size, self._size))
        pixels = img.load()
        for y in range(self._size):
            for x in range(self._size):
                i = (y * self._size + x) % len(seed)
                pixels[x, y] = (
                    seed[i],
                    seed[(i + 7) % len(seed)],
                    seed[(i + 13) % len(seed)],
                )
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()


def get_image_provider(settings: Settings) -> ImageProvider:
    if settings.image_provider == "openai" and settings.image_api_key:
        return OpenAIImageProvider(settings)
    return FakeImageProvider()
