"""Validation Engine (§R5.5/§R5.9) — orchestrates the pipeline + quality gate into an immutable
``ValidationReport``. It runs rules and applies the declarative gate; it does **not** generate text,
call an LLM, or embed (owner req 8/17/18). Fully independent of the AI Engine — the AI Engine sees
only the ``OutputValidator`` adapter (built in composition).
"""

from __future__ import annotations

from app.validators.gates import QualityGatePolicy
from app.validators.models import ValidationReport
from app.validators.observability import ValidationObservability
from app.validators.pipeline import ValidationPipeline
from app.validators.registry import RuleRegistry
from app.validators.rules import RuleContext


class ValidationEngine:
    def __init__(
        self,
        registry: RuleRegistry,
        gate_policy: QualityGatePolicy,
        *,
        observability: ValidationObservability | None = None,
    ) -> None:
        self._obs = observability if observability is not None else ValidationObservability()
        self._pipeline = ValidationPipeline(registry, observability=self._obs)
        self._gate = gate_policy

    async def validate(self, ctx: RuleContext) -> ValidationReport:
        findings = await self._pipeline.run(ctx)
        passed = self._gate.passed(findings)
        self._obs.logger.event("validation", findings=len(findings), passed=passed)
        return ValidationReport(findings=tuple(findings), passed=passed)
