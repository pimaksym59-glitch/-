"""Image provider protocol (§R6, §R2.10). Port only — no SDK/HTTP/DB. Identity-by-reference (§R6.1)
is advertised as a capability, not hard-coded. Real adapters and the fake implement this.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from app.core.providers.base import Provider


@dataclass(frozen=True, slots=True)
class ImageResult:
    data: bytes
    mime: str
    width: int
    height: int


class ImageProvider(Provider, Protocol):
    async def generate(self, prompt: str, *, size: tuple[int, int] = (512, 512)) -> ImageResult: ...
