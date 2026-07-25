"""Holiday tagging tests (§R8.13) — offline, data-only calendar. Scheduler tags; never generates."""

from __future__ import annotations

import datetime

from app.scheduler.holidays import HolidayCalendar, is_holiday, select_plan


def test_empty_calendar_has_no_holidays() -> None:
    cal = HolidayCalendar()
    assert not is_holiday(datetime.date(2026, 12, 25), cal)
    assert select_plan(datetime.date(2026, 12, 25), cal) is None


def test_holiday_lookup_and_plan() -> None:
    cal = HolidayCalendar({datetime.date(2026, 12, 31): "new_year_eve"})
    assert is_holiday(datetime.date(2026, 12, 31), cal)
    assert select_plan(datetime.date(2026, 12, 31), cal) == "new_year_eve"


def test_non_holiday_date() -> None:
    cal = HolidayCalendar({datetime.date(2026, 12, 31): "new_year_eve"})
    assert not is_holiday(datetime.date(2026, 12, 30), cal)
    assert select_plan(datetime.date(2026, 12, 30), cal) is None
