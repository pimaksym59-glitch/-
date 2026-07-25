"""Validation composition (§R5.5, owner req 2). Builds the Validation Engine and adapts it to the
Stage-12 ``OutputValidator`` Protocol so the AI Engine consumes validation **without importing the
Validation Engine** — the adapter lives here, in the service layer. Memory/RAG (semantic dedup) and
the LLM-judge (humanness) plug in via ports; offline defaults are deterministic fakes (RV-13 for the
real ones). The Stage-12 AI Engine is unchanged.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from dataclasses import dataclass, field

from app.content.engine import AIEngine
from app.content.validation import OutputValidator, ValidationResult
from app.core.config import Settings
from app.services.ai import build_ai_engine
from app.validators.deduplication import DeduplicationRule
from app.validators.engine import ValidationEngine
from app.validators.fakes import FakeDuplicationChecker, FakeHumannessScorer
from app.validators.gates import QualityGatePolicy
from app.validators.humanization import HumanizationRule
from app.validators.persona import PersonaRule
from app.validators.policy import PolicyRule
from app.validators.ports import DuplicationChecker, HumannessScorer
from app.validators.registry import RuleRegistry
from app.validators.rules import RuleContext


def default_rule_registry() -> RuleRegistry:
    """Register the built-in rules (dedup / humanization / persona / policy)."""
    registry = RuleRegistry()
    for rule in (DeduplicationRule(), HumanizationRule(), PersonaRule(), PolicyRule()):
        registry.register(rule)
    return registry


def build_validation_engine(
    *,
    registry: RuleRegistry | None = None,
    gate_policy: QualityGatePolicy | None = None,
) -> ValidationEngine:
    return ValidationEngine(
        registry if registry is not None else default_rule_registry(),
        gate_policy if gate_policy is not None else QualityGatePolicy(),
    )


@dataclass(frozen=True, slots=True)
class ValidationContextTemplate:
    """Per-generation validation inputs bound at composition (channel policy/persona data +
    ports)."""

    channel_id: uuid.UUID | None = None
    banned_words: Sequence[str] = ()
    allowed_topics: Sequence[str] = ()
    max_length: int | None = None
    forbidden_expressions: Sequence[str] = ()
    recent_texts: Sequence[str] = ()
    similarity_threshold: float = 0.85
    humanness_min: int = 75
    checker: DuplicationChecker | None = None
    scorer: HumannessScorer | None = None
    extra: dict[str, str] = field(default_factory=dict)


class _OutputValidatorAdapter:
    """Adapts a ``ValidationEngine`` to the Stage-12 ``OutputValidator`` port (structural)."""

    def __init__(self, engine: ValidationEngine, template: ValidationContextTemplate) -> None:
        self._engine = engine
        self._template = template

    async def validate(self, text: str) -> ValidationResult:
        template = self._template
        ctx = RuleContext(
            text=text,
            channel_id=template.channel_id,
            banned_words=template.banned_words,
            allowed_topics=template.allowed_topics,
            max_length=template.max_length,
            forbidden_expressions=template.forbidden_expressions,
            recent_texts=template.recent_texts,
            similarity_threshold=template.similarity_threshold,
            humanness_min=template.humanness_min,
            checker=template.checker,
            scorer=template.scorer,
        )
        report = await self._engine.validate(ctx)
        return ValidationResult(
            passed=report.passed, issues=tuple(finding.message for finding in report.findings)
        )


def build_output_validator(
    settings: Settings,
    *,
    template: ValidationContextTemplate | None = None,
    engine: ValidationEngine | None = None,
) -> OutputValidator:
    """An ``OutputValidator`` backed by the Validation Engine (offline defaults use fakes)."""
    tmpl = template if template is not None else _default_template(settings)
    return _OutputValidatorAdapter(
        engine if engine is not None else build_validation_engine(), tmpl
    )


def build_ai_engine_with_validation(
    settings: Settings, *, template: ValidationContextTemplate | None = None
) -> AIEngine:
    """AI Engine wired with a real validator through the Stage-12 seam (engine unchanged)."""
    return build_ai_engine(
        settings, validators=[build_output_validator(settings, template=template)]
    )


def _default_template(settings: Settings) -> ValidationContextTemplate:
    return ValidationContextTemplate(
        similarity_threshold=settings.similarity_threshold,
        humanness_min=settings.humanness_min,
        checker=FakeDuplicationChecker(),
        scorer=FakeHumannessScorer(),
    )
