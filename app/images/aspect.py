"""Aspect ratio (§R6, owner req 8) — a first-class model, never string literals. Named ratios are
module constants; code compares/uses ``AspectRatio`` objects, not "16:9" strings.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class AspectRatio:
    width: int
    height: int

    def __post_init__(self) -> None:
        if self.width <= 0 or self.height <= 0:
            raise ValueError("aspect ratio sides must be positive")

    @property
    def value(self) -> float:
        return self.width / self.height


SQUARE = AspectRatio(1, 1)
LANDSCAPE = AspectRatio(16, 9)
PORTRAIT = AspectRatio(9, 16)
STANDARD = AspectRatio(4, 3)
STANDARD_PORTRAIT = AspectRatio(3, 4)
