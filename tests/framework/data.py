"""Deterministic data generation (owner reqs 5-data, 21) — reproducible values, no randomness.

Every generator draws only from a :class:`~tests.framework.seed.SeedManager` (owner req 6):
the same base seed + label yields identical sequences of ids, text, timestamps and vectors.
``DeterministicClock`` is a monotonic injected clock. There is no ``random``/``time`` here.

"""

from __future__ import annotations

import datetime
import hashlib

from tests.framework.seed import SeedManager

_EPOCH = datetime.datetime(2026, 1, 1, tzinfo=datetime.UTC)


class DeterministicClock:
    """Monotonic clock advancing by a fixed step per :meth:`now` call."""

    def __init__(self, step_seconds: float = 1.0, start: datetime.datetime | None = None) -> None:
        self._current = start if start is not None else _EPOCH
        self._step = datetime.timedelta(seconds=step_seconds)

    def now(self) -> datetime.datetime:
        value = self._current
        self._current = self._current + self._step
        return value


class SeededGenerator:
    """Reproducible generator bound to one seed label (owner reqs 6, 7)."""

    def __init__(self, seeds: SeedManager, label: str = "default") -> None:
        self._base = seeds.derive(label)
        self._n = 0

    def _draw(self) -> int:
        self._n += 1
        digest = hashlib.sha256(f"{self._base}:{self._n}".encode()).digest()
        return int.from_bytes(digest[:8], "big")

    def integer(self, low: int, high: int) -> int:
        """Deterministic integer in ``[low, high]``."""

        if high < low:
            raise ValueError("high must be >= low")
        span = high - low + 1
        return low + self._draw() % span

    def identifier(self, prefix: str = "id") -> str:
        """Deterministic identifier ``<prefix>-<hex>``."""

        return f"{prefix}-{self._draw():016x}"

    def text(self, prefix: str = "text") -> str:
        """Deterministic short text token."""

        return f"{prefix}-{self._draw() % 100000:05d}"

    def timestamp(self, step_seconds: float = 60.0) -> datetime.datetime:
        """Deterministic timestamp (epoch + n·step)."""

        return _EPOCH + datetime.timedelta(seconds=step_seconds * self._n_advance())

    def _n_advance(self) -> int:
        self._n += 1
        return self._n

    def vector(self, dim: int) -> tuple[float, ...]:
        """Deterministic unit-ish vector of fixed dimension."""

        return tuple((self._draw() % 1000) / 1000.0 for _ in range(dim))
