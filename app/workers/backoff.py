"""Exponential backoff with jitter (§Appendix B) — pure functions only.

Base 30s, multiplier x2, cap 1h, +/-10% jitter. ``rand`` is injectable for deterministic tests.
"""

from __future__ import annotations

import random
from collections.abc import Callable

BASE_DELAY = 30.0  # seconds
MULTIPLIER = 2.0
MAX_DELAY = 3_600.0  # 1 hour cap
JITTER_RATIO = 0.1  # ±10%


def compute_delay(attempt: int, *, rand: Callable[[], float] = random.random) -> float:
    """Backoff delay (seconds) for a 0-based retry ``attempt``. Deterministic given ``rand``."""
    if attempt < 0:
        raise ValueError("attempt must be >= 0")
    capped = min(BASE_DELAY * (MULTIPLIER**attempt), MAX_DELAY)
    jittered = capped * (1.0 + JITTER_RATIO * (2.0 * rand() - 1.0))
    return min(jittered, MAX_DELAY)
