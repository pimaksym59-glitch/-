"""Filtering component (owner req 15) — a standalone, declarative filter over attribute values.

A :class:`FilterSet` is a conjunction of :class:`Filter` predicates evaluated against object
attributes. Deterministic and framework-free.

"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from enum import StrEnum


class FilterOp(StrEnum):
    """Supported comparison operators."""

    EQ = "eq"
    NE = "ne"
    IN = "in"
    CONTAINS = "contains"


@dataclass(frozen=True, slots=True)
class Filter:
    """A single declarative predicate on an attribute (owner req 15)."""

    field: str
    op: FilterOp
    value: object

    def matches(self, item: object) -> bool:
        actual = getattr(item, self.field, None)
        if self.op is FilterOp.EQ:
            return bool(actual == self.value)
        if self.op is FilterOp.NE:
            return bool(actual != self.value)
        if self.op is FilterOp.IN:
            return isinstance(self.value, (tuple, list, set, frozenset)) and actual in self.value
        # CONTAINS
        return isinstance(actual, str) and isinstance(self.value, str) and self.value in actual


@dataclass(frozen=True, slots=True)
class FilterSet:
    """A conjunction of filters (all must match)."""

    filters: tuple[Filter, ...] = field(default_factory=tuple)

    def matches(self, item: object) -> bool:
        return all(f.matches(item) for f in self.filters)


def apply_filters[T](items: Sequence[T], filter_set: FilterSet) -> tuple[T, ...]:
    """Return items matching every filter in the set."""

    return tuple(item for item in items if filter_set.matches(item))
