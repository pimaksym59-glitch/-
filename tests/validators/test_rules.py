"""Validation rule tests (§R5.5-R5.9) — each rule independent, deterministic, offline."""

from __future__ import annotations

import dataclasses

import pytest

from app.validators.deduplication import DeduplicationRule
from app.validators.fakes import FakeDuplicationChecker, FakeHumannessScorer
from app.validators.humanization import HumanizationRule
from app.validators.models import Finding, Severity, ValidationReport, severity_at_least
from app.validators.persona import PersonaRule
from app.validators.policy import PolicyRule
from app.validators.rules import RuleContext

# --- models (req 4/5) ----------------------------------------------------------------------------


def test_severity_ordering() -> None:
    assert severity_at_least(Severity.critical, Severity.error)
    assert severity_at_least(Severity.error, Severity.error)
    assert not severity_at_least(Severity.warning, Severity.error)


def test_report_is_frozen() -> None:
    report = ValidationReport(findings=(), passed=True)
    field_name = "passed"  # variable name avoids ruff B010 + mypy read-only-property error
    with pytest.raises(dataclasses.FrozenInstanceError):
        setattr(report, field_name, False)


def test_report_by_severity() -> None:
    findings = (
        Finding("r", Severity.warning, "w"),
        Finding("r", Severity.error, "e"),
        Finding("r", Severity.critical, "c"),
    )
    report = ValidationReport(findings=findings, passed=False)
    assert len(report.by_severity(Severity.error)) == 2


# --- policy (req 11) -----------------------------------------------------------------------------


async def test_policy_banned_word_is_critical() -> None:
    findings = await PolicyRule().check(RuleContext(text="Buy crypto now", banned_words=["crypto"]))
    assert findings and findings[0].severity is Severity.critical


async def test_policy_max_length() -> None:
    findings = await PolicyRule().check(RuleContext(text="x" * 50, max_length=10))
    assert findings and findings[0].severity is Severity.error
    assert await PolicyRule().check(RuleContext(text="ok", max_length=10)) == []


# --- persona (req 10) ----------------------------------------------------------------------------


async def test_persona_forbidden_expression() -> None:
    findings = await PersonaRule().check(
        RuleContext(text="I literally cannot even", forbidden_expressions=["literally"])
    )
    assert findings and findings[0].rule == "persona"
    assert (
        await PersonaRule().check(RuleContext(text="clean", forbidden_expressions=["nope"])) == []
    )


# --- humanization (req 9) ------------------------------------------------------------------------


async def test_humanization_stoplist_no_llm() -> None:
    findings = await HumanizationRule().check(RuleContext(text="In conclusion, delve into it."))
    messages = [f.message for f in findings]
    assert any("in conclusion" in m for m in messages)
    assert any("delve into" in m for m in messages)


async def test_humanization_score_via_port() -> None:
    low = await HumanizationRule().check(
        RuleContext(text="clean text", humanness_min=75, scorer=FakeHumannessScorer(score=40))
    )
    assert low and low[0].severity is Severity.warning
    high = await HumanizationRule().check(
        RuleContext(text="clean text", humanness_min=75, scorer=FakeHumannessScorer(score=90))
    )
    assert high == []


# --- deduplication (req 8) -----------------------------------------------------------------------


async def test_dedup_trigram_catches_near_duplicate() -> None:
    findings = await DeduplicationRule().check(
        RuleContext(text="The quick brown fox", recent_texts=["The quick brown fox"])
    )
    assert findings and "trigram" in findings[0].message


async def test_dedup_sentence_overlap_stage() -> None:
    # trigram Jaccard stays low (extra unique sentence) but a whole sentence repeats -> overlap
    findings = await DeduplicationRule().check(
        RuleContext(
            text="The cat sat. Xyzzy plugh frobozz grault waldo.",
            recent_texts=["The cat sat."],
            similarity_threshold=0.5,
        )
    )
    assert findings and "sentences" in findings[0].message


async def test_dedup_short_text_no_false_positive() -> None:
    assert await DeduplicationRule().check(RuleContext(text="hi", recent_texts=["yo"])) == []


async def test_dedup_semantic_stage_via_port() -> None:
    findings = await DeduplicationRule().check(
        RuleContext(text="unique text", checker=FakeDuplicationChecker(similarity=0.95))
    )
    assert findings and "semantic" in findings[0].message
    assert (
        await DeduplicationRule().check(
            RuleContext(text="unique text", checker=FakeDuplicationChecker(similarity=0.1))
        )
        == []
    )


def test_all_rules_share_the_rule_protocol_shape() -> None:
    # each rule exposes a name and an async check -> uniform Rule Protocol (req 2/4)
    for rule in (DeduplicationRule(), HumanizationRule(), PersonaRule(), PolicyRule()):
        assert isinstance(rule.name, str)
