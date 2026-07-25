"""Persona validation rule (§R5, owner req 10) — a separate module, independent of humanization. It
flags a persona's forbidden expressions appearing in the text. Pure, deterministic; data comes from
``RuleContext`` (persona settings).
"""

from __future__ import annotations

from app.validators.models import Finding, Severity
from app.validators.rules import RuleContext


class PersonaRule:
    name = "persona"

    async def check(self, ctx: RuleContext) -> list[Finding]:
        lowered = ctx.text.lower()
        return [
            Finding("persona", Severity.error, f"forbidden expression: {expr!r}")
            for expr in ctx.forbidden_expressions
            if expr.lower() in lowered
        ]
