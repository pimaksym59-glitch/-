"""Cost-tracking hooks (§R5.12, owner req 13) — **hooks only, no cost computation / billing**. The
engine hands per-call token ``Usage`` to a sink; a real implementation persists to ``api_usage`` and
prices it later. Default no-op; a recording sink supports tests.
"""

from __future__ import annotations

from typing import Protocol

from app.content.types import Usage


class CostSink(Protocol):
    async def record(self, usage: Usage, *, provider: str) -> None: ...


class NoOpCostSink:
    async def record(self, usage: Usage, *, provider: str) -> None: ...


class RecordingCostSink:
    """Captures usage for assertions (no pricing)."""

    def __init__(self) -> None:
        self.records: list[tuple[Usage, str]] = []

    async def record(self, usage: Usage, *, provider: str) -> None:
        self.records.append((usage, provider))
