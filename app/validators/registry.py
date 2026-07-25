"""Rule registry (owner req 3) — fully typed, thread-safe, extensible, deterministic. The engine
runs
whatever rules are registered; adding a rule (including an ML validator, owner req 13) needs no
engine
change. ``all()`` returns rules ordered by name so runs are deterministic.
"""

from __future__ import annotations

import threading

from app.validators.rules import Rule


class RuleNotRegistered(LookupError):
    """No rule registered under the requested name."""


class RuleRegistry:
    def __init__(self) -> None:
        self._rules: dict[str, Rule] = {}
        self._lock = threading.Lock()

    def register(self, rule: Rule, *, replace: bool = False) -> None:
        with self._lock:
            if rule.name in self._rules and not replace:
                raise ValueError(f"rule already registered: {rule.name}")
            self._rules[rule.name] = rule

    def get(self, name: str) -> Rule:
        with self._lock:
            try:
                return self._rules[name]
            except KeyError as exc:
                raise RuleNotRegistered(name) from exc

    def all(self) -> tuple[Rule, ...]:
        """Registered rules ordered by name (deterministic)."""
        with self._lock:
            return tuple(self._rules[name] for name in sorted(self._rules))

    def names(self) -> tuple[str, ...]:
        with self._lock:
            return tuple(sorted(self._rules))
