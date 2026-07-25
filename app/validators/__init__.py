"""Domain: Validation Engine (§R5.5-R5.9) — a fully independent subsystem. It imports **no**
other app
package (stdlib only); Memory/RAG and the LLM-judge integrate solely through the
``DuplicationChecker``
/ ``HumannessScorer`` ports. The AI Engine sees validation only via the Stage-12 ``OutputValidator``
Protocol, adapted in :mod:`app.services.validation`.
"""

from __future__ import annotations

from app.validators.decision import RewriteDecision, decide
from app.validators.deduplication import DeduplicationRule
from app.validators.engine import ValidationEngine
from app.validators.gates import QualityGatePolicy
from app.validators.humanization import HumanizationRule
from app.validators.models import Finding, Severity, ValidationReport
from app.validators.persona import PersonaRule
from app.validators.policy import PolicyRule
from app.validators.ports import DuplicationChecker, HumannessScorer
from app.validators.registry import RuleNotRegistered, RuleRegistry
from app.validators.rules import Rule, RuleContext

__all__ = [
    "DeduplicationRule",
    "DuplicationChecker",
    "Finding",
    "HumanizationRule",
    "HumannessScorer",
    "PersonaRule",
    "PolicyRule",
    "QualityGatePolicy",
    "RewriteDecision",
    "Rule",
    "RuleContext",
    "RuleNotRegistered",
    "RuleRegistry",
    "Severity",
    "ValidationEngine",
    "ValidationReport",
    "decide",
]
