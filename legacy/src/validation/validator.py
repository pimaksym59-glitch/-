"""Compose the validation rules into a single pass. Pure (no I/O)."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field

from . import rules


@dataclass
class ValidationResult:
    ok: bool
    issues: list[str] = field(default_factory=list)


def validate_post(
    *,
    body: str | None,
    image_path: str | None,
    image_exists: bool,
    recent_bodies: Sequence[str],
    min_chars: int,
    max_chars: int,
    banned_patterns: Sequence[str],
    duplicate_threshold: float,
) -> ValidationResult:
    text = body or ""
    issues = [
        issue
        for issue in (
            rules.check_length(text, min_chars=min_chars, max_chars=max_chars),
            rules.check_banned(text, banned_patterns),
            rules.check_duplicate(text, recent_bodies, threshold=duplicate_threshold),
            rules.check_image(image_path, image_exists=image_exists),
        )
        if issue is not None
    ]
    return ValidationResult(ok=not issues, issues=issues)
