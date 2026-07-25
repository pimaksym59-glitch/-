"""Scheduler — task producer (§R8.1): materializes schedules into tasks. No business logic.

Time math (:mod:`timing`, :mod:`missed`, :mod:`holidays`) is pure/offline; :mod:`scanner`,
:mod:`materializer` and :mod:`scheduler` orchestrate; :mod:`advisory`, :mod:`runner` and :mod:`run`
handle coordination/lifecycle. Materialization goes only through the Stage-8 ``TaskProducer``.
"""

from __future__ import annotations

from app.scheduler.advisory import AdvisoryLock, lock_key
from app.scheduler.holidays import HolidayCalendar, is_holiday, select_plan
from app.scheduler.materializer import Materializer, slot_dedup_key
from app.scheduler.missed import slots_to_materialize
from app.scheduler.runner import SchedulerRunner
from app.scheduler.scanner import DueSlot, ScheduleView, due_slots, view_from_row
from app.scheduler.scheduler import SchedulerEngine, TickResources
from app.scheduler.timing import (
    CronRule,
    PublicationWindow,
    SlotRule,
    WeeklyRule,
    apply_lead_time,
    build_rule,
    iter_slots_utc,
    next_slot_utc,
    parse_cron,
    resolve_tz,
    shift_into_window,
    to_utc,
)

__all__ = [
    "AdvisoryLock",
    "CronRule",
    "DueSlot",
    "HolidayCalendar",
    "Materializer",
    "PublicationWindow",
    "ScheduleView",
    "SchedulerEngine",
    "SchedulerRunner",
    "SlotRule",
    "TickResources",
    "WeeklyRule",
    "apply_lead_time",
    "build_rule",
    "due_slots",
    "is_holiday",
    "iter_slots_utc",
    "lock_key",
    "next_slot_utc",
    "parse_cron",
    "resolve_tz",
    "select_plan",
    "shift_into_window",
    "slot_dedup_key",
    "slots_to_materialize",
    "to_utc",
    "view_from_row",
]
