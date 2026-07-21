"""Schedule → next-run computation (cron or fixed interval). Pure, testable."""

from __future__ import annotations

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from croniter import croniter


def compute_next_run(
    *,
    cron: str | None,
    interval_seconds: int | None,
    timezone: str,
    after: datetime,
) -> datetime | None:
    """Return the next fire time strictly after `after` (tz-aware UTC), or None.

    `cron` takes precedence over `interval_seconds`. Cron expressions are
    evaluated in `timezone`; the result is always returned as tz-aware UTC.
    """
    if after.tzinfo is None:
        raise ValueError("`after` must be timezone-aware")

    if cron:
        tz = ZoneInfo(timezone)
        local_after = after.astimezone(tz)
        nxt = croniter(cron, local_after).get_next(datetime)
        return nxt.astimezone(ZoneInfo("UTC"))

    if interval_seconds and interval_seconds > 0:
        return after + timedelta(seconds=interval_seconds)

    return None
