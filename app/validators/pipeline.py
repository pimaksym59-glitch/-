"""Validation pipeline (owner req 6) — modular, single responsibility: run the registered rules over
a ``RuleContext`` and collect findings. It does not decide pass/fail (that is the quality gate) and
does not generate text (owner req 8). Deterministic (registry order).
"""

from __future__ import annotations

from app.validators.models import Finding
from app.validators.observability import ValidationObservability
from app.validators.registry import RuleRegistry
from app.validators.rules import RuleContext


class ValidationPipeline:
    def __init__(
        self, registry: RuleRegistry, *, observability: ValidationObservability | None = None
    ) -> None:
        self._registry = registry
        self._obs = observability if observability is not None else ValidationObservability()

    async def run(self, ctx: RuleContext) -> list[Finding]:
        findings: list[Finding] = []
        for rule in self._registry.all():
            findings.extend(await rule.check(ctx))
            self._obs.metrics.incr(f"validation.rule.{rule.name}")
        return findings
