"""PostgreSQL advisory-lock wrapper (§R8.10) — ensures a single scheduler instance materializes a
given slot-scan per tick. This is infrastructure coordination only; the task ``dedup_key`` remains
the authoritative guard against duplicate slots (advisory lock just avoids redundant work / races).

Real locking requires a live PostgreSQL (Runtime Verification Pending); the SQL text and key
derivation are statically verifiable offline.
"""

from __future__ import annotations

import hashlib
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

_TRY_LOCK = text("SELECT pg_try_advisory_lock(:key)")
_UNLOCK = text("SELECT pg_advisory_unlock(:key)")

# Session-level advisory keys are signed 64-bit integers.
_INT64_MIN = -(2**63)
_INT64_MAX = 2**63 - 1


def lock_key(name: str) -> int:
    """Derive a stable signed 64-bit advisory-lock key from a name (e.g. ``"scheduler:tick"``)."""
    digest = hashlib.sha256(name.encode("utf-8")).digest()[:8]
    return int.from_bytes(digest, "big", signed=True)


class AdvisoryLock:
    """Session-scoped ``pg_try_advisory_lock`` / ``pg_advisory_unlock`` (non-blocking acquire)."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def try_lock(self, key: int) -> bool:
        """Try to acquire the advisory lock without blocking. True if acquired."""
        _require_int64(key)
        result = await self._session.execute(_TRY_LOCK, {"key": key})
        return bool(result.scalar_one())

    async def unlock(self, key: int) -> bool:
        """Release the advisory lock. True if this session held it."""
        _require_int64(key)
        result = await self._session.execute(_UNLOCK, {"key": key})
        return bool(result.scalar_one())

    @asynccontextmanager
    async def hold(self, key: int) -> AsyncIterator[bool]:
        """Context manager yielding whether the lock was acquired; releases it on exit if held."""
        acquired = await self.try_lock(key)
        try:
            yield acquired
        finally:
            if acquired:
                await self.unlock(key)


def _require_int64(key: int) -> None:
    if not _INT64_MIN <= key <= _INT64_MAX:
        raise ValueError(f"advisory lock key out of signed 64-bit range: {key}")
