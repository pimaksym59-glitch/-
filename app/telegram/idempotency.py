"""Idempotency (§R7.4, owner req 12) — a **separate** layer (not mixed with retry). The publisher
marks the ``dedup_key`` **before** sending (at-least-once), so a retry/replay never publishes twice.
Public ``IdempotencyGuard`` Protocol; in-memory fake offline, Redis-backed in composition (RV-15).
"""

from __future__ import annotations

from typing import Protocol


class IdempotencyGuard(Protocol):
    async def seen(self, dedup_key: str) -> bool: ...

    async def mark(self, dedup_key: str) -> None: ...
