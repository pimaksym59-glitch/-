"""Validation models (§R5.5/§R5.9, owner req 4/5) — immutable. ``Severity`` is a first-class model
(never a string literal); ``Finding`` and ``ValidationReport`` are frozen. The Validation Engine is
independent of the AI Engine — these types carry no ``app.content`` dependency.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from enum import StrEnum


class Severity(StrEnum):
    info = "info"
    warning = "warning"
    error = "error"
    critical = "critical"


_ORDER: tuple[Severity, ...] = (Severity.info, Severity.warning, Severity.error, Severity.critical)


def severity_rank(severity: Severity) -> int:
    return _ORDER.index(severity)


def severity_at_least(severity: Severity, threshold: Severity) -> bool:
    """True if ``severity`` is at least as severe as ``threshold`` (ordered model, not strings)."""
    return severity_rank(severity) >= severity_rank(threshold)


@dataclass(frozen=True, slots=True)
class Finding:
    rule: str
    severity: Severity
    message: str
    detail: Mapping[str, str] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class ValidationReport:
    findings: tuple[Finding, ...]
    passed: bool

    def by_severity(self, threshold: Severity) -> tuple[Finding, ...]:
        return tuple(f for f in self.findings if severity_at_least(f.severity, threshold))
