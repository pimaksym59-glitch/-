"""Validation engine tests (§R5.5-R5.9): registry, gates, decision, engine, observability."""

from __future__ import annotations

import pytest

from app.validators.decision import RewriteDecision, decide
from app.validators.engine import ValidationEngine
from app.validators.gates import QualityGatePolicy
from app.validators.models import Finding, Severity, ValidationReport
from app.validators.observability import ValidationObservability
from app.validators.policy import PolicyRule
from app.validators.registry import RuleNotRegistered, RuleRegistry
from app.validators.rules import Rule, RuleContext


class _NoopRule:
    name = "noop"

    async def check(self, ctx: RuleContext) -> list[Finding]:
        return []


def _engine(
    registry: RuleRegistry, *, observability: ValidationObservability | None = None
) -> ValidationEngine:
    return ValidationEngine(registry, QualityGatePolicy(), observability=observability)


# --- registry (req 3) ----------------------------------------------------------------------------


def test_registry_is_deterministic_and_typed() -> None:
    registry = RuleRegistry()
    registry.register(PolicyRule())
    registry.register(_NoopRule())
    assert registry.names() == ("noop", "policy")  # sorted -> deterministic
    got: Rule = registry.get("policy")
    assert got.name == "policy"


def test_registry_rejects_duplicate_and_unknown() -> None:
    registry = RuleRegistry()
    registry.register(PolicyRule())
    with pytest.raises(ValueError, match="already registered"):
        registry.register(PolicyRule())
    registry.register(PolicyRule(), replace=True)  # explicit replace ok
    with pytest.raises(RuleNotRegistered):
        registry.get("missing")


# --- quality gates (req 12) ----------------------------------------------------------------------


def test_quality_gate_is_declarative() -> None:
    error_finding = [Finding("policy", Severity.error, "e")]
    warning_finding = [Finding("humanization", Severity.warning, "w")]
    assert QualityGatePolicy().passed(warning_finding)  # warning < error -> passes
    assert not QualityGatePolicy().passed(error_finding)  # error blocks
    # declarative soft-rule: mark policy soft -> its error no longer blocks
    assert QualityGatePolicy(soft_rules=frozenset({"policy"})).passed(error_finding)


# --- decision (req 7) ----------------------------------------------------------------------------


def test_decision_only_decides() -> None:
    assert decide(ValidationReport((), passed=True)) is RewriteDecision.accept
    assert (
        decide(ValidationReport((Finding("policy", Severity.error, "e"),), passed=False))
        is RewriteDecision.rewrite
    )
    assert (
        decide(ValidationReport((Finding("policy", Severity.critical, "c"),), passed=False))
        is RewriteDecision.needs_review
    )


# --- engine end-to-end ---------------------------------------------------------------------------


async def test_engine_runs_rules_and_applies_gate() -> None:
    registry = RuleRegistry()
    registry.register(PolicyRule())
    engine = _engine(registry)
    assert (await engine.validate(RuleContext(text="clean"))).passed
    bad = await engine.validate(RuleContext(text="crypto", banned_words=["crypto"]))
    assert not bad.passed and bad.findings


async def test_observability_hooks_fire() -> None:
    class _Counter:
        def __init__(self) -> None:
            self.count = 0

        def incr(self, name: str) -> None:
            self.count += 1

    counter = _Counter()
    registry = RuleRegistry()
    registry.register(PolicyRule())
    engine = _engine(registry, observability=ValidationObservability(metrics=counter))
    await engine.validate(RuleContext(text="clean"))
    assert counter.count == 1  # one rule -> one metric increment
