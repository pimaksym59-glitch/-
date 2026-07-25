"""Structured-output + validation + rewrite tests (§R5.5/R5.6, owner req 6/8/9/10)."""

from __future__ import annotations

import pytest
from pydantic import BaseModel

from app.content.rewrite import RewritePolicy
from app.content.structured import (
    StructuredOutputError,
    StructuredOutputParser,
    StructuredOutputValidator,
)
from app.content.validation import AlwaysPass, ValidationResult


class _Post(BaseModel):
    title: str
    body: str


def test_parser_parses_valid_json() -> None:
    parsed = StructuredOutputParser(_Post).parse('{"title": "t", "body": "b"}')
    assert parsed == _Post(title="t", body="b")


def test_parser_rejects_bad_json() -> None:
    with pytest.raises(StructuredOutputError, match="invalid JSON"):
        StructuredOutputParser(_Post).parse("not json")


def test_parser_rejects_schema_mismatch() -> None:
    with pytest.raises(StructuredOutputError, match="schema mismatch"):
        StructuredOutputParser(_Post).parse('{"title": "t"}')  # missing body


async def test_structured_validator_bridges_into_validation_seam() -> None:
    validator = StructuredOutputValidator(_Post)
    ok = await validator.validate('{"title": "t", "body": "b"}')
    assert ok.passed
    bad = await validator.validate("nope")
    assert not bad.passed and bad.issues


async def test_always_pass() -> None:
    assert (await AlwaysPass().validate("anything")).passed


def test_rewrite_policy_decision() -> None:
    policy = RewritePolicy()
    passed = ValidationResult(passed=True)
    failed = ValidationResult(passed=False, issues=["too short"])
    assert not policy.should_rewrite(0, passed, max_rewrites=3)  # passing -> stop
    assert policy.should_rewrite(0, failed, max_rewrites=3)  # failing, attempts remain
    assert not policy.should_rewrite(3, failed, max_rewrites=3)  # exhausted


def test_rewrite_refine_appends_deterministic_feedback() -> None:
    policy = RewritePolicy()
    failed = ValidationResult(passed=False, issues=["too short", "off topic"])
    refined = policy.refine("BASE", failed)
    assert refined.startswith("BASE")
    assert "too short; off topic" in refined
    assert policy.refine("BASE", ValidationResult(passed=False)) == "BASE"  # no issues -> unchanged
