"""Unit tests for the scheduler's pure logic (no DB/Redis required)."""

from datetime import UTC, datetime, timedelta

import pytest

from app.models.enums import TaskStatus
from scheduler.backoff import compute_backoff
from scheduler.rules import dependency_is_broken, is_runnable, should_retry
from scheduler.timing import compute_next_run

NOW = datetime(2026, 7, 20, 12, 0, tzinfo=UTC)


# ── backoff ──────────────────────────────────────────────────────────────
def test_backoff_grows_and_caps():
    d1 = compute_backoff(1, jitter=0).total_seconds()
    d2 = compute_backoff(2, jitter=0).total_seconds()
    d3 = compute_backoff(3, jitter=0).total_seconds()
    assert d1 == 2.0 and d2 == 4.0 and d3 == 8.0
    assert compute_backoff(100, jitter=0).total_seconds() == 300.0  # capped


def test_backoff_jitter_within_bounds():
    for _ in range(50):
        secs = compute_backoff(3, jitter=0.1).total_seconds()
        assert 8.0 * 0.9 <= secs <= 8.0 * 1.1


# ── timing ───────────────────────────────────────────────────────────────
def test_interval_next_run():
    nxt = compute_next_run(cron=None, interval_seconds=3600, timezone="UTC", after=NOW)
    assert nxt == NOW + timedelta(hours=1)


def test_cron_next_run_is_utc():
    # 09:00 daily in a +02:00 zone → 07:00 UTC.
    nxt = compute_next_run(
        cron="0 9 * * *", interval_seconds=None, timezone="Europe/Berlin", after=NOW
    )
    assert nxt.tzinfo is not None
    assert nxt.hour == 7 and nxt.utcoffset() == timedelta(0)


def test_cron_precedence_over_interval():
    nxt = compute_next_run(cron="0 * * * *", interval_seconds=5, timezone="UTC", after=NOW)
    assert nxt == NOW + timedelta(hours=1)  # top of next hour, not +5s


def test_no_schedule_returns_none():
    assert compute_next_run(cron=None, interval_seconds=None, timezone="UTC", after=NOW) is None


def test_naive_after_rejected():
    with pytest.raises(ValueError):
        compute_next_run(cron=None, interval_seconds=60, timezone="UTC", after=datetime(2026, 1, 1))


# ── rules ────────────────────────────────────────────────────────────────
def test_runnable_no_dependency():
    assert is_runnable(
        status=TaskStatus.pending, available_at=None, now=NOW, dependency_status=None
    )


def test_not_runnable_when_future_available_at():
    assert not is_runnable(
        status=TaskStatus.pending,
        available_at=NOW + timedelta(minutes=1),
        now=NOW,
        dependency_status=None,
    )


def test_not_runnable_until_dependency_succeeds():
    assert not is_runnable(
        status=TaskStatus.pending, available_at=None, now=NOW, dependency_status=TaskStatus.running
    )
    assert is_runnable(
        status=TaskStatus.pending,
        available_at=None,
        now=NOW,
        dependency_status=TaskStatus.succeeded,
    )


def test_running_task_not_runnable():
    assert not is_runnable(
        status=TaskStatus.running, available_at=None, now=NOW, dependency_status=None
    )


def test_dependency_broken_and_retry():
    assert dependency_is_broken(TaskStatus.failed)
    assert dependency_is_broken(TaskStatus.cancelled)
    assert not dependency_is_broken(TaskStatus.succeeded)
    assert should_retry(1, 3) and not should_retry(3, 3)
