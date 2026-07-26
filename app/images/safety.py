"""Safety layer (§R6.2, owner req 10) — **decision only, never generates**. It inspects the prompt/
spec before generation and returns a verdict (fictional actors only — no real-person likeness — plus
banned content). Markers/terms are data (channel-supplied); deterministic.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

from app.images.types import ImageSpec

# Default markers that would request a real person's likeness (§R6.2 — actors are fictional).
_DEFAULT_REAL_PERSON_MARKERS: tuple[str, ...] = (
    "celebrity",
    "real person",
    "president",
    "politician",
    "photograph of a real",
)


@dataclass(frozen=True, slots=True)
class SafetyVerdict:
    allowed: bool
    reasons: tuple[str, ...] = ()


class SafetyRejected(Exception):
    """Raised by the engine when the safety layer blocks a request (no image is generated)."""

    def __init__(self, reasons: Sequence[str]) -> None:
        super().__init__("; ".join(reasons))
        self.reasons = tuple(reasons)


class SafetyLayer:
    def __init__(
        self,
        *,
        banned_terms: Sequence[str] = (),
        real_person_markers: Sequence[str] = _DEFAULT_REAL_PERSON_MARKERS,
    ) -> None:
        self._banned = tuple(term.lower() for term in banned_terms)
        self._markers = tuple(marker.lower() for marker in real_person_markers)

    def check(self, spec: ImageSpec, prompt: str) -> SafetyVerdict:
        lowered = prompt.lower()
        reasons: list[str] = []
        reasons.extend(
            f"real-person likeness: {marker!r}" for marker in self._markers if marker in lowered
        )
        reasons.extend(f"banned content: {term!r}" for term in self._banned if term in lowered)
        return SafetyVerdict(allowed=not reasons, reasons=tuple(reasons))
