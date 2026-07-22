"""Retry backoff — pure function, no I/O, so it is trivially testable."""

from __future__ import annotations

import random
from datetime import timedelta


def compute_backoff(
    attempts: int,
    *,
    base_seconds: float = 2.0,
    factor: float = 2.0,
    cap_seconds: float = 300.0,
    jitter: float = 0.1,
) -> timedelta:
    """Exponential backoff with a cap and +/- jitter.

    `attempts` is the number of attempts already made (>= 1 after the first
    failure). Delay = min(cap, base * factor**(attempts-1)) then jittered.
    """
    attempts = max(attempts, 1)
    raw = base_seconds * (factor ** (attempts - 1))
    delay = min(raw, cap_seconds)
    if jitter:
        spread = delay * jitter
        delay = max(0.0, delay + random.uniform(-spread, spread))
    return timedelta(seconds=delay)
