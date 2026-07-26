"""Post-processing pipeline (§R6.8, owner req 12) — an independent pipeline; each stage is its own
component. Offline & deterministic: a thumbnail (Pillow) and a perceptual hash (average-hash) are
produced from the image bytes for the storage record (§R6.8). CLIP embeddings are a port/RV-14.
"""

from __future__ import annotations

import io
from dataclasses import dataclass

from PIL import Image


@dataclass(frozen=True, slots=True)
class PostProcessResult:
    thumbnail: bytes
    phash: str


class ThumbnailStage:
    def __init__(self, size: tuple[int, int] = (256, 256)) -> None:
        self._size = size

    def render(self, image: Image.Image) -> bytes:
        thumb = image.copy()
        thumb.thumbnail(self._size)
        buffer = io.BytesIO()
        thumb.save(buffer, format="PNG")
        return buffer.getvalue()


class PhashStage:
    """Average-hash: 8x8 grayscale, bit set where pixel > mean. Deterministic 64-bit hex."""

    _SIDE = 8

    def compute(self, image: Image.Image) -> str:
        small = image.convert("L").resize((self._SIDE, self._SIDE))
        pixels = list(small.tobytes())  # 64 grayscale bytes (0..255), no deprecated getdata
        mean = sum(pixels) / len(pixels)
        bits = 0
        for index, pixel in enumerate(pixels):
            if pixel > mean:
                bits |= 1 << index
        return f"{bits:016x}"


class PostProcessingPipeline:
    def __init__(
        self, *, thumbnail: ThumbnailStage | None = None, phash: PhashStage | None = None
    ) -> None:
        self._thumbnail = thumbnail if thumbnail is not None else ThumbnailStage()
        self._phash = phash if phash is not None else PhashStage()

    def run(self, data: bytes) -> PostProcessResult:
        image = Image.open(io.BytesIO(data)).convert("RGB")
        return PostProcessResult(
            thumbnail=self._thumbnail.render(image), phash=self._phash.compute(image)
        )
