"""Streaming / progressive generation integration point (owner req 14) — **seam only, no progressive
generation**. The engine notifies the sink at the integration point; a real progressive transport
plugs in later. Default no-op.
"""

from __future__ import annotations

from typing import Protocol


class ImageStreamSink(Protocol):
    async def on_progress(self, fraction: float) -> None: ...
    async def on_complete(self) -> None: ...


class NoOpImageStreamSink:
    async def on_progress(self, fraction: float) -> None: ...
    async def on_complete(self) -> None: ...
