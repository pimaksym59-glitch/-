"""Humanization rule (§R5.8/§R1.6, owner req 9) — a separate module. The stop-list gate (banned
AI cliches) is pure text, **no LLM**. The humanness threshold is checked via the ``HumannessScorer``
port (the real LLM-judge lives behind the port, RV-13). Deterministic given the port.
"""

from __future__ import annotations

from app.validators.models import Finding, Severity
from app.validators.rules import RuleContext

# Common AI cliches / boilerplate (§R1.6) — a stop-list gate, no model involved.
_AI_CLICHES: tuple[str, ...] = (
    "as an ai",
    "in conclusion",
    "delve into",
    "in today's fast-paced world",
    "it is important to note",
    "unlock the power",
    "in the realm of",
    "navigating the",
    "a tapestry of",
    "it's worth noting that",
)


class HumanizationRule:
    name = "humanization"

    async def check(self, ctx: RuleContext) -> list[Finding]:
        findings: list[Finding] = []
        lowered = ctx.text.lower()
        for phrase in _AI_CLICHES:
            if phrase in lowered:
                findings.append(Finding("humanization", Severity.error, f"AI cliche: {phrase!r}"))
        if ctx.scorer is not None:
            score = await ctx.scorer.score(ctx.text)
            if score < ctx.humanness_min:
                findings.append(
                    Finding(
                        "humanization",
                        Severity.warning,
                        f"humanness {score} < {ctx.humanness_min}",
                    )
                )
        return findings
