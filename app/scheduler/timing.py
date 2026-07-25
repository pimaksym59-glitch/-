"""Pure slot-time calculation (§R8.5-R8.7): schedule spec -> next slot(s) in the channel's IANA
timezone -> UTC, DST-aware. No I/O, no DB, no clock reads — every function takes its inputs
explicitly so the whole module is deterministic and ~100% unit-testable offline.

DST rule (§R8.6), realized by localizing with ``fold=0`` then ``astimezone(UTC)``:

* nonexistent local time (spring-forward gap) -> shifted forward past the gap;
* ambiguous local time (fall-back) -> the first (earlier) occurrence.

Weekday convention: ``day_of_week`` uses Python's ``date.weekday()`` (Monday=0 .. Sunday=6). Cron's
day-of-week field uses the cron convention (Sunday=0 or 7) and is normalized internally.
"""

from __future__ import annotations

import datetime
from collections.abc import Iterator
from dataclasses import dataclass
from functools import lru_cache
from typing import Protocol
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

_MINUTE = datetime.timedelta(minutes=1)
# Upper bound on the forward minute-scan for the next slot: a valid recurring rule fires within a
# year; beyond this we treat the rule as producing no slot rather than looping unbounded.
_SCAN_CAP_MINUTES = 366 * 24 * 60
# Margin (>= max DST shift) applied when enumerating local candidates for a UTC window, so a slot
# near a transition is never missed before the precise UTC-bound filter is applied.
_DST_MARGIN = datetime.timedelta(hours=2)


@lru_cache(maxsize=256)
def resolve_tz(name: str) -> ZoneInfo:
    """Resolve an IANA timezone name (cached). Raises ``ValueError`` on unknown zone (fail-fast)."""
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError) as exc:
        raise ValueError(f"unknown timezone: {name!r}") from exc


def to_utc(naive_local: datetime.datetime, tz: ZoneInfo) -> datetime.datetime:
    """Localize a naive wall-clock time in ``tz`` to aware UTC, applying the §R8.6 DST rule.

    ``fold=0`` yields the shifted-forward instant for nonexistent times and the first occurrence for
    ambiguous times (verified against known Europe/Berlin transitions).
    """
    return naive_local.replace(tzinfo=tz, fold=0).astimezone(datetime.UTC)


def is_imaginary(naive_local: datetime.datetime, tz: ZoneInfo) -> bool:
    """True if ``naive_local`` falls in a spring-forward gap (does not exist in ``tz``)."""
    aware = naive_local.replace(tzinfo=tz, fold=0)
    return aware != aware.astimezone(datetime.UTC).astimezone(tz)


def is_ambiguous(naive_local: datetime.datetime, tz: ZoneInfo) -> bool:
    """True if ``naive_local`` occurs twice (fall-back) in ``tz``."""
    before = naive_local.replace(tzinfo=tz, fold=0)
    after = naive_local.replace(tzinfo=tz, fold=1)
    return before.utcoffset() != after.utcoffset()


class SlotRule(Protocol):
    """A recurrence rule evaluated against naive local wall-clock minutes."""

    def matches(self, moment: datetime.datetime) -> bool: ...


@dataclass(frozen=True, slots=True)
class WeeklyRule:
    """Weekly recurrence: ``day_of_week`` (Mon=0..Sun=6) at ``time_local`` (minute precision)."""

    day_of_week: int
    time_local: datetime.time

    def matches(self, moment: datetime.datetime) -> bool:
        return (
            moment.weekday() == self.day_of_week
            and moment.hour == self.time_local.hour
            and moment.minute == self.time_local.minute
        )


@dataclass(frozen=True, slots=True)
class CronRule:
    """Standard 5-field cron (minute hour day-of-month month day-of-week), minute precision.

    Supports ``*``, single values, ``a-b`` ranges, ``a-b/s`` / ``*/s`` steps, and ``,`` lists.
    When both day-of-month and day-of-week are restricted, cron OR-semantics apply.
    """

    minutes: frozenset[int]
    hours: frozenset[int]
    doms: frozenset[int]
    months: frozenset[int]
    dows: frozenset[int]
    dom_restricted: bool
    dow_restricted: bool

    def matches(self, moment: datetime.datetime) -> bool:
        if moment.minute not in self.minutes or moment.hour not in self.hours:
            return False
        if moment.month not in self.months:
            return False
        return self._day_matches(moment)

    def _day_matches(self, moment: datetime.datetime) -> bool:
        day_hit = moment.day in self.doms
        # cron day-of-week: Sunday=0..Saturday=6; Python weekday() is Monday=0..Sunday=6.
        week_hit = ((moment.weekday() + 1) % 7) in self.dows
        if self.dom_restricted and self.dow_restricted:
            return day_hit or week_hit
        if self.dom_restricted:
            return day_hit
        if self.dow_restricted:
            return week_hit
        return True


def build_rule(
    *,
    cron: str | None,
    day_of_week: int | None,
    time_local: datetime.time | None,
) -> SlotRule:
    """Build a :class:`SlotRule` from a schedule row. Exactly one form must be provided (§R8.5)."""
    if cron is not None:
        if day_of_week is not None or time_local is not None:
            raise ValueError("schedule must set either cron or day_of_week+time_local, not both")
        return parse_cron(cron)
    if day_of_week is None or time_local is None:
        raise ValueError("schedule requires cron, or both day_of_week and time_local")
    if not 0 <= day_of_week <= 6:
        raise ValueError(f"day_of_week must be 0..6 (Mon..Sun), got {day_of_week}")
    return WeeklyRule(day_of_week=day_of_week, time_local=time_local)


_CRON_BOUNDS = {
    "minutes": (0, 59),
    "hours": (0, 23),
    "doms": (1, 31),
    "months": (1, 12),
}
# day-of-week is parsed with an upper bound of 7 (both 0 and 7 mean Sunday), then normalized mod 7.


def parse_cron(expr: str) -> CronRule:
    """Parse a standard 5-field cron expression into a :class:`CronRule` (fail-fast if invalid)."""
    fields = expr.split()
    if len(fields) != 5:
        raise ValueError(f"cron must have 5 fields, got {len(fields)}: {expr!r}")
    minute_f, hour_f, dom_f, month_f, dow_f = fields
    return CronRule(
        minutes=_parse_field(minute_f, *_CRON_BOUNDS["minutes"]),
        hours=_parse_field(hour_f, *_CRON_BOUNDS["hours"]),
        doms=_parse_field(dom_f, *_CRON_BOUNDS["doms"]),
        months=_parse_field(month_f, *_CRON_BOUNDS["months"]),
        dows=frozenset(d % 7 for d in _parse_field(dow_f, 0, 7)),  # normalize 7 -> 0 (Sunday)
        dom_restricted=dom_f.strip() != "*",
        dow_restricted=dow_f.strip() != "*",
    )


def _parse_field(field: str, low: int, high: int) -> frozenset[int]:
    values: set[int] = set()
    for part in field.split(","):
        values.update(_parse_part(part.strip(), low, high))
    return frozenset(values)


def _parse_part(part: str, low: int, high: int) -> set[int]:
    range_spec, _, step_spec = part.partition("/")
    step = _parse_int(step_spec, "step") if step_spec else 1
    if step <= 0:
        raise ValueError(f"cron step must be positive: {part!r}")
    if range_spec == "*":
        start, stop = low, high
    elif "-" in range_spec:
        start_s, _, stop_s = range_spec.partition("-")
        start, stop = _parse_int(start_s, "range"), _parse_int(stop_s, "range")
    else:
        start = stop = _parse_int(range_spec, "value")
        if step_spec:  # "n/s" means "from n to high, every s"
            stop = high
    if start < low or stop > high or start > stop:
        raise ValueError(f"cron value out of range [{low},{high}]: {part!r}")
    return set(range(start, stop + 1, step))


def _parse_int(text: str, kind: str) -> int:
    try:
        return int(text)
    except ValueError as exc:
        raise ValueError(f"invalid cron {kind}: {text!r}") from exc


def next_slot_utc(
    rule: SlotRule, tz: ZoneInfo, *, after: datetime.datetime
) -> datetime.datetime | None:
    """First slot strictly after ``after`` (aware UTC) as aware UTC, or None if none within a year.

    The scan is over local wall-clock minutes (cron/weekly semantics are wall-clock); each candidate
    is localized to UTC with the DST rule and compared against ``after`` in UTC.
    """
    cursor = _truncate_to_minute(after.astimezone(tz))
    for _ in range(_SCAN_CAP_MINUTES):
        cursor += _MINUTE
        if rule.matches(cursor):
            candidate = to_utc(cursor, tz)
            if candidate > after:
                return candidate
    return None


def iter_slots_utc(
    rule: SlotRule, tz: ZoneInfo, *, after: datetime.datetime, until: datetime.datetime
) -> Iterator[datetime.datetime]:
    """Yield every slot in the half-open UTC interval ``(after, until]``, ascending.

    Local candidates are enumerated with a DST margin, localized to UTC, then filtered precisely by
    the UTC bounds — so transitions near a boundary neither drop nor duplicate a slot.
    """
    if until <= after:
        return
    cursor = _truncate_to_minute((after - _DST_MARGIN).astimezone(tz))
    end_local = (until + _DST_MARGIN).astimezone(tz)
    # Collect then sort: across a spring-forward gap a later local minute can localize to an earlier
    # UTC instant, so scan order is not guaranteed ascending in UTC. A set also dedupes.
    found: set[datetime.datetime] = set()
    while cursor <= end_local:
        if rule.matches(cursor):
            candidate = to_utc(cursor, tz)
            if after < candidate <= until:
                found.add(candidate)
        cursor += _MINUTE
    yield from sorted(found)


def apply_lead_time(slot_utc: datetime.datetime, lead_minutes: int) -> datetime.datetime:
    """Head-of-pipeline start time: ``slot - LEAD_TIME`` (§R8.5). ``lead_minutes`` >= 0."""
    if lead_minutes < 0:
        raise ValueError("lead_minutes must be >= 0")
    return slot_utc - datetime.timedelta(minutes=lead_minutes)


@dataclass(frozen=True, slots=True)
class PublicationWindow:
    """Allowed publishing time-of-day window in the channel's local time (§R8.7)."""

    start: datetime.time
    end: datetime.time


def shift_into_window(
    naive_local: datetime.datetime, window: PublicationWindow
) -> datetime.datetime:
    """Move a local slot to the nearest valid time inside ``window`` (§R8.7) — never drop it.

    Before the window -> window start same day; after the window -> window start next day.
    """
    tod = naive_local.time()
    if window.start <= tod <= window.end:
        return naive_local
    at_start = naive_local.replace(
        hour=window.start.hour, minute=window.start.minute, second=0, microsecond=0
    )
    if tod < window.start:
        return at_start
    return at_start + datetime.timedelta(days=1)


def _truncate_to_minute(moment: datetime.datetime) -> datetime.datetime:
    return moment.replace(second=0, microsecond=0)
