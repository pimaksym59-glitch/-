"""Holiday tagging (§R8.13) — pure. A per-channel calendar maps dates to a content-plan name; the
scheduler only *tags* the materialized task payload with ``holiday``/``plan`` so the AI content
stage (§5) can choose an appropriate plan. No content generation, no business logic here — the
scheduler merely coordinates (§R8.13).
"""

from __future__ import annotations

import datetime
from collections.abc import Mapping
from dataclasses import dataclass, field


@dataclass(frozen=True, slots=True)
class HolidayCalendar:
    """Data-only calendar: local dates -> content-plan name. Empty means "no holidays"."""

    plans_by_date: Mapping[datetime.date, str] = field(default_factory=dict)


def is_holiday(day: datetime.date, calendar: HolidayCalendar) -> bool:
    """True if ``day`` (the slot's *local* date) is a holiday in ``calendar``."""
    return day in calendar.plans_by_date


def select_plan(day: datetime.date, calendar: HolidayCalendar) -> str | None:
    """Content-plan name for ``day``, or None on a normal day. The scheduler passes this to the
    payload as a hint; the actual plan/content is decided by the AI stage (§R8.13, §5).
    """
    return calendar.plans_by_date.get(day)
