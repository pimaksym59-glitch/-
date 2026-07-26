"""Search component (owner req 15) — a standalone, deterministic text search over chosen fields.

Two interchangeable strategies (substring, token) match a query against selected string
attributes. No external search backend; the real full-text/index-backed search is a later
concern.

"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True, slots=True)
class SearchQuery:
    """A search over named string fields of an item."""

    text: str
    fields: tuple[str, ...]


class SearchStrategy(Protocol):
    """Decides whether an item matches a query (owner req 15)."""

    def matches(self, item: object, query: SearchQuery) -> bool: ...


def _field_values(item: object, fields: tuple[str, ...]) -> list[str]:
    values: list[str] = []
    for name in fields:
        actual = getattr(item, name, None)
        if isinstance(actual, str):
            values.append(actual)
    return values


class SubstringSearch(SearchStrategy):
    """Case-insensitive substring match on any of the query fields."""

    def matches(self, item: object, query: SearchQuery) -> bool:
        needle = query.text.casefold()
        if not needle:
            return True
        return any(needle in value.casefold() for value in _field_values(item, query.fields))


class TokenSearch(SearchStrategy):
    """Case-insensitive all-tokens match: every whitespace token must appear in some field."""

    def matches(self, item: object, query: SearchQuery) -> bool:
        tokens = query.text.casefold().split()
        if not tokens:
            return True
        haystack = " ".join(_field_values(item, query.fields)).casefold()
        return all(token in haystack for token in tokens)


def search[T](items: Sequence[T], query: SearchQuery, strategy: SearchStrategy) -> tuple[T, ...]:
    """Return items matching the query under the given strategy."""

    return tuple(item for item in items if strategy.matches(item, query))
