"""Image cost-tracking hooks (§R6, owner req 15) — **hooks only, no cost computation**. The engine
hands per-generation ``Usage`` to a sink; a real implementation prices and persists it later.
Default
no-op; a recording sink supports tests.
"""

from __future__ import annotations

from typing import Protocol

from app.images.types import Usage


class ImageCostSink(Protocol):
    async def record(self, usage: Usage, *, provider: str) -> None: ...


class NoOpImageCostSink:
    async def record(self, usage: Usage, *, provider: str) -> None: ...


class RecordingImageCostSink:
    def __init__(self) -> None:
        self.records: list[tuple[Usage, str]] = []

    async def record(self, usage: Usage, *, provider: str) -> None:
        self.records.append((usage, provider))
