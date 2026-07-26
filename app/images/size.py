"""Size policy (§R6, owner req 9) — a separate strategy, independent of aspect ratio. Given an
``AspectRatio`` it resolves a concrete ``(width, height)`` within limits, rounded to a multiple.
Deterministic; a different strategy can be swapped without touching aspect or the engine.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from app.images.aspect import AspectRatio


@dataclass(frozen=True, slots=True)
class SizeLimits:
    min_side: int = 256
    max_side: int = 1536
    multiple_of: int = 64


class SizePolicy(Protocol):
    def resolve(self, aspect: AspectRatio) -> tuple[int, int]: ...


class BoundedSizePolicy:
    """Fit the long side to ``target_long_side``, clamp to limits, round to ``multiple_of``."""

    def __init__(self, *, target_long_side: int = 1024, limits: SizeLimits | None = None) -> None:
        self._target = target_long_side
        self._limits = limits if limits is not None else SizeLimits()

    def resolve(self, aspect: AspectRatio) -> tuple[int, int]:
        if aspect.width >= aspect.height:
            width = self._target
            height = round(self._target * aspect.height / aspect.width)
        else:
            height = self._target
            width = round(self._target * aspect.width / aspect.height)
        return self._round(width), self._round(height)

    def _round(self, side: int) -> int:
        limits = self._limits
        clamped = max(limits.min_side, min(limits.max_side, side))
        rounded = max(1, round(clamped / limits.multiple_of)) * limits.multiple_of
        return max(limits.min_side, min(limits.max_side, rounded))
