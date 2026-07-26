"""Chaos test strategy (owner reqs 13, 20) — a model only, no real chaos.

Deterministically injects faults (429 / timeout / permanent — the §R2.10 fake inventory) into
a scenario and checks the recovery decision. It never disrupts real infrastructure; a real
chaos backend is a seam (RV-18).

"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from enum import StrEnum
from typing import Protocol


class FaultKind(StrEnum):
    """Modelled fault kinds (mirrors the §R2.10 fake Telegram error modes)."""

    NONE = "none"
    RATE_LIMITED = "rate_limited"
    TIMEOUT = "timeout"
    PERMANENT = "permanent"


@dataclass(frozen=True, slots=True)
class FaultSpec:
    """A fault to inject at a labelled point."""

    at: str
    kind: FaultKind


@dataclass(frozen=True, slots=True)
class ChaosOutcome:
    """The injected fault and the resulting recovery decision."""

    injected: FaultKind
    recovered: bool


class FaultInjector(Protocol):
    """Port that yields the fault to apply at a given point (deterministic)."""

    def fault_at(self, label: str) -> FaultKind: ...


class DeterministicFaultInjector(FaultInjector):
    """Injects faults from a fixed label→kind map (no randomness, owner req 21)."""

    def __init__(self, faults: dict[str, FaultKind] | None = None) -> None:
        self._faults = dict(faults or {})

    def fault_at(self, label: str) -> FaultKind:
        return self._faults.get(label, FaultKind.NONE)


class ChaosStrategy:
    """Injects a fault and evaluates a recovery predicate (owner req 13)."""

    def __init__(self, injector: FaultInjector) -> None:
        self._injector = injector

    def run(self, label: str, recover: Callable[[FaultKind], bool]) -> ChaosOutcome:
        """Apply the fault for ``label`` and record whether ``recover`` handles it."""

        fault = self._injector.fault_at(label)
        return ChaosOutcome(injected=fault, recovered=recover(fault))


class ChaosToolSeam:
    """Seam for a future real chaos backend — not implemented (owner req 20, RV-18)."""

    implemented = False

    def run(self, *args: object, **kwargs: object) -> None:
        raise NotImplementedError("chaos testing is Runtime Verification Pending (RV-18)")
