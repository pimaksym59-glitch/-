"""Missed-execution policy tests (§R8.10) — offline: missed-within-grace, past-grace drop, next."""

from __future__ import annotations

import datetime

from app.scheduler import missed, timing

UTC = datetime.UTC
BERLIN = timing.resolve_tz("Europe/Berlin")


def _utc(y: int, mo: int, d: int, h: int = 0, mi: int = 0) -> datetime.datetime:
    return datetime.datetime(y, mo, d, h, mi, tzinfo=UTC)


def _hourly() -> timing.SlotRule:
    return timing.parse_cron("0 * * * *")  # top of every hour


def test_recent_missed_within_grace_included() -> None:
    now = _utc(2026, 7, 24, 12, 30)
    slots = missed.slots_to_materialize(
        _hourly(),
        BERLIN,
        since=_utc(2026, 7, 24, 9, 0),
        now=now,
        grace=datetime.timedelta(hours=3),
        include_next=False,
    )
    # grace=3h -> window (09:30, 12:30]; hourly slots 10:00/11:00/12:00 kept, 09:00 dropped.
    assert slots == [_utc(2026, 7, 24, 10, 0), _utc(2026, 7, 24, 11, 0), _utc(2026, 7, 24, 12, 0)]


def test_past_grace_dropped() -> None:
    now = _utc(2026, 7, 24, 12, 30)
    slots = missed.slots_to_materialize(
        _hourly(),
        BERLIN,
        since=_utc(2026, 7, 20, 0, 0),
        now=now,
        grace=datetime.timedelta(hours=1),
        include_next=False,
    )
    assert slots == [_utc(2026, 7, 24, 12, 0)]  # only the last hour survives grace


def test_include_next_appends_future_slot() -> None:
    now = _utc(2026, 7, 24, 12, 30)
    slots = missed.slots_to_materialize(
        _hourly(),
        BERLIN,
        since=now,
        now=now,
        grace=datetime.timedelta(hours=1),
    )
    assert slots == [_utc(2026, 7, 24, 13, 0)]  # nothing missed (since==now), nearest future only


def test_since_newer_than_cutoff_limits_lookback() -> None:
    now = _utc(2026, 7, 24, 12, 30)
    # since is more recent than now-grace, so lower bound = since (11:15) -> only 12:00 missed.
    slots = missed.slots_to_materialize(
        _hourly(),
        BERLIN,
        since=_utc(2026, 7, 24, 11, 15),
        now=now,
        grace=datetime.timedelta(hours=6),
        include_next=False,
    )
    assert slots == [_utc(2026, 7, 24, 12, 0)]


def test_default_grace_is_six_hours() -> None:
    assert datetime.timedelta(hours=6) == missed.DEFAULT_GRACE
