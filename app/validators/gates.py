"""Quality gates (§R5.9, owner req 12) — **declarative**. The engine hardcodes no checks: whether a
report passes is decided by ``QualityGatePolicy`` data — the blocking severity and the set of soft
rules (whose findings never block). Hard-gate findings (severity >= blocking) fail the report.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field

from app.validators.models import Finding, Severity, severity_at_least


@dataclass(frozen=True, slots=True)
class QualityGatePolicy:
    blocking_severity: Severity = Severity.error
    soft_rules: frozenset[str] = field(default_factory=frozenset)

    def passed(self, findings: Sequence[Finding]) -> bool:
        """False if any hard finding (severity >= blocking, from a non-soft rule) is present."""
        return not any(
            severity_at_least(finding.severity, self.blocking_severity)
            and finding.rule not in self.soft_rules
            for finding in findings
        )
