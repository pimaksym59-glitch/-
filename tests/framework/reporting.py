"""Test reporting (owner req 16) — a standalone component.

Aggregates test results into a deterministic report. Export to JUnit/HTML/CI formats is a
declared seam (RV-18). No dependency on any test runner internals.

"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from enum import StrEnum
from typing import Protocol


class Outcome(StrEnum):
    """Result of a single test."""

    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass(frozen=True, slots=True)
class TestResult:
    """One test's result."""

    __test__ = False  # not a pytest test class

    name: str
    outcome: Outcome
    level: str


@dataclass(frozen=True, slots=True)
class TestReport:
    """Aggregated counts over a set of results."""

    __test__ = False  # not a pytest test class

    total: int
    passed: int
    failed: int
    skipped: int

    @property
    def green(self) -> bool:
        return self.failed == 0


class TestReporter(Protocol):
    """Receives results and produces a report (owner req 16)."""

    def add(self, result: TestResult) -> None: ...

    def report(self) -> TestReport: ...


class InMemoryTestReporter(TestReporter):
    """Deterministic in-memory reporter."""

    def __init__(self) -> None:
        self._results: list[TestResult] = []

    def add(self, result: TestResult) -> None:
        self._results.append(result)

    def add_all(self, results: Sequence[TestResult]) -> None:
        self._results.extend(results)

    def results(self) -> tuple[TestResult, ...]:
        return tuple(self._results)

    def report(self) -> TestReport:
        passed = sum(1 for r in self._results if r.outcome is Outcome.PASSED)
        failed = sum(1 for r in self._results if r.outcome is Outcome.FAILED)
        skipped = sum(1 for r in self._results if r.outcome is Outcome.SKIPPED)
        return TestReport(total=len(self._results), passed=passed, failed=failed, skipped=skipped)


class ReportExportSeam:
    """Seam for JUnit/HTML/CI export — not implemented (owner req 18, RV-18)."""

    implemented = False

    def export(self, report: TestReport, fmt: str) -> str:
        raise NotImplementedError("report export is Runtime Verification Pending (RV-18)")
