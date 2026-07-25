"""Policy validation rule (§R5.9, owner req 11) — a separate module, independent of the others. It
enforces content policy from ``RuleContext`` data: banned words (critical) and maximum length. Pure,
deterministic.
"""

from __future__ import annotations

from app.validators.models import Finding, Severity
from app.validators.rules import RuleContext


class PolicyRule:
    name = "policy"

    async def check(self, ctx: RuleContext) -> list[Finding]:
        findings: list[Finding] = []
        lowered = ctx.text.lower()
        findings.extend(
            Finding("policy", Severity.critical, f"banned word: {word!r}")
            for word in ctx.banned_words
            if word.lower() in lowered
        )
        if ctx.max_length is not None and len(ctx.text) > ctx.max_length:
            findings.append(
                Finding("policy", Severity.error, f"too long: {len(ctx.text)} > {ctx.max_length}")
            )
        return findings
