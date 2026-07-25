"""Similarity — a separate, swappable interface (owner req 10, §R9.7). The retrieval kernel depends
on the ``Similarity`` protocol, never a concrete algorithm, so cosine can be replaced without
touching
retrieval. Pure, deterministic math — no I/O.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from typing import Protocol


class Similarity(Protocol):
    def score(self, a: Sequence[float], b: Sequence[float]) -> float: ...


class CosineSimilarity:
    """Cosine similarity in [-1, 1]; 0.0 for a zero-magnitude vector. Deterministic."""

    def score(self, a: Sequence[float], b: Sequence[float]) -> float:
        if len(a) != len(b):
            raise ValueError(f"vector length mismatch: {len(a)} != {len(b)}")
        dot = sum(x * y for x, y in zip(a, b, strict=True))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(y * y for y in b))
        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0
        return dot / (norm_a * norm_b)
