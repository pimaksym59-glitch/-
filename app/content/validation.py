"""Validation layer (§R5.5, owner req 9) — an extensible seam. The engine runs a list of
``OutputValidator``; a failing result drives a rewrite. Concrete domain gates (grammar, humanness,
uniqueness — §R5.5-R5.9) arrive in Stage 14 and plug in here without engine changes. The default is
a permissive validator.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from typing import Protocol


@dataclass(frozen=True, slots=True)
class ValidationResult:
    passed: bool
    issues: Sequence[str] = field(default_factory=tuple)


class OutputValidator(Protocol):
    async def validate(self, text: str) -> ValidationResult: ...


class AlwaysPass:
    """Default validator — accepts any output (real gates land in Stage 14)."""

    async def validate(self, text: str) -> ValidationResult:
        return ValidationResult(passed=True)
