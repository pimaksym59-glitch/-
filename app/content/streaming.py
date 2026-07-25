"""Streaming integration points (owner req 12) — **seam only, no streaming implemented**. The engine
notifies the sink at the integration point; a real transport plugs in later. Default no-op.
"""

from __future__ import annotations

from typing import Protocol


class StreamSink(Protocol):
    async def on_token(self, token: str) -> None: ...
    async def on_complete(self) -> None: ...


class NoOpStreamSink:
    async def on_token(self, token: str) -> None: ...
    async def on_complete(self) -> None: ...
