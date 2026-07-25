"""Advisory-lock tests (§R8.10) — offline. Key derivation + range guard. Real locking is gated
integration (see test_integration.py), Runtime Verification Pending.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.scheduler.advisory import AdvisoryLock, lock_key


def test_lock_key_is_deterministic() -> None:
    assert lock_key("scheduler:tick") == lock_key("scheduler:tick")


def test_lock_key_distinct_for_distinct_names() -> None:
    assert lock_key("scheduler:tick") != lock_key("scheduler:other")


def test_lock_key_within_signed_int64() -> None:
    for name in ("a", "scheduler:tick", "very-long-lock-name-x" * 10):
        key = lock_key(name)
        assert -(2**63) <= key <= 2**63 - 1


async def test_try_lock_rejects_out_of_range_key_before_db() -> None:
    # A non-connecting engine: the range guard must raise before any SQL is executed.
    engine = create_async_engine("postgresql+asyncpg://u:p@localhost:5432/db")
    lock = AdvisoryLock(AsyncSession(engine))
    with pytest.raises(ValueError, match="out of signed 64-bit range"):
        await lock.try_lock(2**63)
    with pytest.raises(ValueError, match="out of signed 64-bit range"):
        await lock.unlock(-(2**63) - 1)
    await engine.dispose()
