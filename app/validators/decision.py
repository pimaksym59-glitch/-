"""Auto-rewrite decision (§R5.6, owner req 7) — **decision only, never runs a rewrite**. Given a
report it returns accept / rewrite / needs_review; the AI Engine owns the rewrite loop (§R5.6). A
critical finding routes to human review (no rewrite can fix a banned word); otherwise a failed
report
requests a rewrite.
"""

from __future__ import annotations

from enum import StrEnum

from app.validators.models import Severity, ValidationReport


class RewriteDecision(StrEnum):
    accept = "accept"
    rewrite = "rewrite"
    needs_review = "needs_review"


def decide(report: ValidationReport) -> RewriteDecision:
    if report.passed:
        return RewriteDecision.accept
    if any(finding.severity is Severity.critical for finding in report.findings):
        return RewriteDecision.needs_review
    return RewriteDecision.rewrite
