"""Missed-execution policy (§R8.10 recovery) — pure. Decides which slots a stateless scheduler
should materialize on a given tick: recently-missed slots (within a grace window) plus the nearest
upcoming slot. Slots older than the grace window are dropped so a long outage does not flood the
queue with stale work. Idempotency (no duplicate materialization) is enforced downstream by the
task ``dedup_key``; this module only computes the set.
"""

from __future__ import annotations

import datetime
from zoneinfo import ZoneInfo

from app.scheduler.timing import SlotRule, iter_slots_utc, next_slot_utc

# Default grace window: how far back a missed slot may be and still be worth running (§R8.10).
DEFAULT_GRACE = datetime.timedelta(hours=6)


def slots_to_materialize(
    rule: SlotRule,
    tz: ZoneInfo,
    *,
    since: datetime.datetime,
    now: datetime.datetime,
    grace: datetime.timedelta = DEFAULT_GRACE,
    include_next: bool = True,
) -> list[datetime.datetime]:
    """Slots (aware UTC, ascending) to materialize now.

    * Missed: every slot in ``(since, now]`` no older than ``grace`` (``now - slot <= grace``).
    * Upcoming: the nearest slot strictly after ``now`` (unless ``include_next`` is False).

    ``since`` is the low-water mark of the last successful scan; on a fresh start pass
    ``now - grace`` so recovery only reaches back one grace window.
    """
    cutoff = now - grace
    lower = max(since, cutoff)
    result = list(iter_slots_utc(rule, tz, after=lower, until=now))
    if include_next:
        upcoming = next_slot_utc(rule, tz, after=now)
        if upcoming is not None:
            result.append(upcoming)
    return result
