"""Individual validation checks — pure, unit-tested.

Each `check_*` returns a human-readable issue string, or None when the content
passes that check.
"""

from __future__ import annotations

import re
from collections.abc import Iterable

_WORD_RE = re.compile(r"\w+", re.UNICODE)


def check_length(body: str, *, min_chars: int, max_chars: int) -> str | None:
    n = len(body.strip())
    if n < min_chars:
        return f"too short ({n} < {min_chars} chars)"
    if n > max_chars:
        return f"too long ({n} > {max_chars} chars)"
    return None


def check_banned(body: str, patterns: Iterable[str]) -> str | None:
    lowered = body.lower()
    hits = [p for p in patterns if p and p.lower() in lowered]
    if hits:
        return f"contains banned content: {', '.join(sorted(hits))}"
    return None


def _tokens(text: str) -> set[str]:
    return {m.group(0).lower() for m in _WORD_RE.finditer(text)}


def jaccard_similarity(a: str, b: str) -> float:
    ta, tb = _tokens(a), _tokens(b)
    if not ta and not tb:
        return 1.0
    if not ta or not tb:
        return 0.0
    inter = len(ta & tb)
    union = len(ta | tb)
    return inter / union


def check_duplicate(body: str, recent_bodies: Iterable[str], *, threshold: float) -> str | None:
    for other in recent_bodies:
        if jaccard_similarity(body, other) >= threshold:
            return f"near-duplicate of a recent post (>= {threshold:.0%} similar)"
    return None


def check_image(image_path: str | None, *, image_exists: bool) -> str | None:
    if image_path and not image_exists:
        return "referenced image file is missing on disk"
    return None
