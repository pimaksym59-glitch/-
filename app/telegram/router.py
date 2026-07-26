"""Router (owner req 3) — **fully declarative**. Routing depends only on the ``RouteRule`` data
(kind
and/or command) and returns the handler name; the engine hardcodes no routing. Deterministic:
first matching rule wins.
"""

from __future__ import annotations

from collections.abc import Sequence

from app.telegram.types import RouteRule, Update


class Router:
    def __init__(self, rules: Sequence[RouteRule]) -> None:
        self._rules = tuple(rules)

    def resolve(self, update: Update) -> str | None:
        for rule in self._rules:
            if self._matches(rule, update):
                return rule.handler
        return None

    @staticmethod
    def _matches(rule: RouteRule, update: Update) -> bool:
        kind_ok = rule.kind is None or update.kind is rule.kind
        command_ok = rule.command is None or (
            update.command is not None and update.command.name == rule.command
        )
        return kind_ok and command_ok
