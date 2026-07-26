"""Unit test architecture (§R3.9) — conventions/helpers for pure-logic tests.

Unit tests exercise pure domain logic with no I/O and are always in CI. This module only
documents the convention and offers a tiny helper to assert a callable is pure w.r.t. a
deterministic input (same input → same output). No production logic (owner req 2).

"""

from __future__ import annotations

from collections.abc import Callable


def assert_deterministic[T, R](fn: Callable[[T], R], value: T, *, runs: int = 3) -> R:
    """Call ``fn(value)`` several times; assert identical results. Returns the result."""

    results = [fn(value) for _ in range(runs)]
    first = results[0]
    if any(result != first for result in results[1:]):
        raise AssertionError("callable is not deterministic for the given input")
    return first
