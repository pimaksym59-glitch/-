"""Framework self-tests (§R13): seed/data/factories/pyramid/strategies/reporting/coverage/seams."""

from __future__ import annotations

import pytest

from tests.framework.architecture import TestCategory, TestLevel, level_meta
from tests.framework.chaos import (
    ChaosStrategy,
    ChaosToolSeam,
    DeterministicFaultInjector,
    FaultKind,
)
from tests.framework.compatibility import CompatibilityRow, CompatibilityStrategy
from tests.framework.concurrency import ConcurrencyStrategy
from tests.framework.coverage import CoveragePolicy, CoverageThreshold
from tests.framework.data import DeterministicClock, SeededGenerator
from tests.framework.e2e import Context, PipelineOrchestrator, StageFn, StageResult
from tests.framework.factories import (
    make_audit_event,
    make_channel_record,
    make_event,
    make_publish_request,
    make_user_record,
)
from tests.framework.fakes import FakeCatalogue
from tests.framework.integration import gate
from tests.framework.markers import MarkerRegistry, integration_enabled
from tests.framework.mutation import (
    Mutant,
    MutationOperator,
    MutationStrategy,
    MutationToolSeam,
)
from tests.framework.performance import LoadToolSeam, PerfBudget, PerformanceStrategy
from tests.framework.property_based import HypothesisSeam, PropertyStrategy
from tests.framework.pyramid import TestPyramid
from tests.framework.regression import RegressionBaseline, RegressionStrategy
from tests.framework.reporting import (
    InMemoryTestReporter,
    Outcome,
    ReportExportSeam,
    TestResult,
)
from tests.framework.seams import GithubActionsCiSeam, XdistDistributedSeam
from tests.framework.seed import SeedManager
from tests.framework.snapshot import (
    InMemorySnapshotStore,
    SnapshotMismatch,
    SnapshotStrategy,
)
from tests.framework.stress import StressStrategy, WorkloadSpec
from tests.framework.unit import assert_deterministic

# --- seed + data (reqs 6, 7, 21) -----------------------------------------------------------------


def test_seed_manager_is_deterministic() -> None:
    a = SeedManager(42)
    b = SeedManager(42)
    assert a.derive("x") == b.derive("x")
    assert a.derive("x") != a.derive("y")
    assert a.child("scope").seed == a.derive("scope")


def test_seeded_generator_reproducible() -> None:
    g1 = SeededGenerator(SeedManager(1), "lbl")
    g2 = SeededGenerator(SeedManager(1), "lbl")
    assert [g1.integer(0, 9) for _ in range(5)] == [g2.integer(0, 9) for _ in range(5)]
    assert SeededGenerator(SeedManager(1), "a").identifier() != ""
    assert len(SeededGenerator(SeedManager(1), "v").vector(4)) == 4


def test_deterministic_clock_monotonic() -> None:
    clock = DeterministicClock(step_seconds=5.0)
    t0 = clock.now()
    t1 = clock.now()
    assert (t1 - t0).total_seconds() == 5.0


# --- factories (reqs 4, 5) -----------------------------------------------------------------------


def test_factories_are_deterministic() -> None:
    seeds = SeedManager(7)
    assert make_event(seeds).source == make_event(SeedManager(7)).source
    assert make_audit_event(seeds).action == "update"
    assert make_channel_record(seeds).bot_token_ref is not None
    assert make_user_record(seeds).email.endswith("@example.com")
    assert make_publish_request(seeds).dedup_key != ""


# --- architecture + pyramid + markers ------------------------------------------------------------


def test_level_meta_and_pyramid() -> None:
    assert level_meta(TestLevel.UNIT).category is TestCategory.OFFLINE
    assert level_meta(TestLevel.INTEGRATION).category is TestCategory.GATED
    pyramid = TestPyramid()
    assert pyramid.is_bottom_heavy()
    assert pyramid.floor_for(TestLevel.UNIT) == 0.90


def test_markers_and_integration_gate() -> None:
    registry = MarkerRegistry()
    assert "integration" in registry.known()
    assert not integration_enabled({})
    assert integration_enabled({"RUN_INTEGRATION": "1"})
    assert gate("PostgreSQL", {}).run is False
    assert gate("PostgreSQL", {"RUN_INTEGRATION": "1"}).run is True


# --- unit helper ---------------------------------------------------------------------------------


def test_assert_deterministic_helper() -> None:
    assert assert_deterministic(lambda x: x * 2, 3) == 6
    with pytest.raises(AssertionError):
        counter = {"n": 0}

        def _impure(_: int) -> int:
            counter["n"] += 1
            return counter["n"]

        assert_deterministic(_impure, 0)


# --- fake catalogue ------------------------------------------------------------------------------


def test_fake_catalogue_lists_public_fakes() -> None:
    catalogue = FakeCatalogue()
    assert "llm" in catalogue.names()
    assert catalogue.get("telegram").__name__ == "FakeTelegramProvider"


# --- snapshot (req 7) ----------------------------------------------------------------------------


def test_snapshot_strategy_stores_then_matches() -> None:
    strategy = SnapshotStrategy(InMemorySnapshotStore())
    strategy.assert_match("k", {"a": 1})
    strategy.assert_match("k", {"a": 1})  # matches
    with pytest.raises(SnapshotMismatch):
        strategy.assert_match("k", {"a": 2})


# --- property-based (req 8) ----------------------------------------------------------------------


def test_property_strategy_holds_and_finds_counterexample() -> None:
    strategy = PropertyStrategy(SeedManager(3), cases=20)
    held = strategy.for_all(lambda g: g.integer(0, 10), lambda n: 0 <= n <= 10)
    assert held.held and held.checked == 20
    failing = strategy.for_all(lambda g: g.integer(0, 10), lambda n: n < 0)
    assert not failing.held and failing.counterexample is not None
    with pytest.raises(NotImplementedError, match="RV-18"):
        HypothesisSeam().run()


# --- mutation (req 9) ----------------------------------------------------------------------------


def test_mutation_strategy_scores() -> None:
    mutants = [
        Mutant(MutationOperator.NEGATE_CONDITIONAL, killed_by_suite=True),
        Mutant(MutationOperator.SWAP_OPERATOR, killed_by_suite=False),
    ]
    outcome = MutationStrategy().evaluate(mutants)
    assert outcome.killed == 1 and outcome.survived == 1 and outcome.score == 0.5
    with pytest.raises(NotImplementedError, match="RV-18"):
        MutationToolSeam().run()


# --- performance (reqs 10, 20) -------------------------------------------------------------------


def test_performance_strategy_budget() -> None:
    strategy = PerformanceStrategy(DeterministicClock(step_seconds=2.0))
    result = strategy.measure(PerfBudget(max_seconds=5.0), lambda: None)
    assert result.seconds == 2.0 and result.within_budget
    tight = PerformanceStrategy(DeterministicClock(step_seconds=10.0))
    assert not tight.measure(PerfBudget(max_seconds=1.0), lambda: None).within_budget
    with pytest.raises(NotImplementedError, match="RV-18"):
        LoadToolSeam().run()


# --- concurrency (reqs 11, 20) -------------------------------------------------------------------


def test_concurrency_strategy_detects_violation() -> None:
    strategy = ConcurrencyStrategy()
    safe = strategy.check_interleavings(("a", "b"), lambda order: True)
    assert safe.safe and safe.checked == 2
    unsafe = strategy.check_interleavings(("a", "b"), lambda order: order[0] == "a")
    assert not unsafe.safe and unsafe.violation == ("b", "a")


# --- stress (reqs 12, 20) ------------------------------------------------------------------------


def test_stress_strategy_capacity() -> None:
    strategy = StressStrategy(capacity_inflight=100.0)
    assert strategy.evaluate(WorkloadSpec(10.0, 60.0, 5)).within_capacity
    assert not strategy.evaluate(WorkloadSpec(50.0, 60.0, 5)).within_capacity
    with pytest.raises(ValueError, match="capacity"):
        StressStrategy(0.0)


# --- chaos (reqs 13, 20) -------------------------------------------------------------------------


def test_chaos_strategy_injects_deterministically() -> None:
    injector = DeterministicFaultInjector({"publish": FaultKind.RATE_LIMITED})
    strategy = ChaosStrategy(injector)
    outcome = strategy.run("publish", lambda fault: fault is not FaultKind.PERMANENT)
    assert outcome.injected is FaultKind.RATE_LIMITED and outcome.recovered
    none = strategy.run("other", lambda fault: fault is FaultKind.NONE)
    assert none.injected is FaultKind.NONE
    with pytest.raises(NotImplementedError, match="RV-18"):
        ChaosToolSeam().run()


# --- compatibility (req 14) ----------------------------------------------------------------------


def test_compatibility_strategy_matrix() -> None:
    strategy = CompatibilityStrategy()
    assert strategy.evaluate(CompatibilityRow((3, 14))).compatible
    bad = strategy.evaluate(CompatibilityRow((3, 12)))
    assert not bad.compatible and bad.reason == "python below floor"
    assert len(strategy.evaluate_all((CompatibilityRow((3, 13)), CompatibilityRow((3, 11))))) == 2


# --- regression (req 15, separate from snapshot) -------------------------------------------------


def test_regression_strategy_detects_change() -> None:
    strategy = RegressionStrategy(RegressionBaseline({"latency": 1.0}), tolerance=0.1)
    assert not strategy.check("latency", 1.05).regressed  # within tolerance
    assert strategy.check("latency", 1.5).regressed  # worse
    fresh = RegressionStrategy(RegressionBaseline())
    assert not fresh.check("new", 5.0).regressed  # first sight captures


# --- reporting (req 16) --------------------------------------------------------------------------


def test_reporting_aggregates() -> None:
    reporter = InMemoryTestReporter()
    reporter.add_all(
        [
            TestResult("t1", Outcome.PASSED, "unit"),
            TestResult("t2", Outcome.FAILED, "unit"),
            TestResult("t3", Outcome.SKIPPED, "integration"),
        ]
    )
    report = reporter.report()
    assert (report.total, report.passed, report.failed, report.skipped) == (3, 1, 1, 1)
    assert not report.green
    with pytest.raises(NotImplementedError, match="RV-18"):
        ReportExportSeam().export(report, "junit")


# --- coverage (req 17, not tied to pytest) -------------------------------------------------------


def test_coverage_policy_evaluates() -> None:
    policy = CoveragePolicy(
        [CoverageThreshold("overall", 0.85), CoverageThreshold("app.admin", 0.90)]
    )
    good = {"overall": 0.9, "app.admin": 0.95}
    assert policy.all_passed(good)
    bad = {"overall": 0.8, "app.admin": 0.99}
    results = policy.evaluate(bad)
    assert not policy.all_passed(bad)
    assert [r.passed for r in results] == [False, True]


# --- e2e orchestrator ----------------------------------------------------------------------------


def test_pipeline_orchestrator_stops_on_failure() -> None:
    orchestrator = PipelineOrchestrator()

    def ok_stage(name: str) -> StageFn:
        def _run(ctx: Context) -> StageResult:
            return StageResult(stage=name, ok=True)

        return _run

    def fail_stage(name: str) -> StageFn:
        def _run(ctx: Context) -> StageResult:
            return StageResult(stage=name, ok=False, detail="boom")

        return _run

    stages: list[tuple[str, StageFn]] = [
        ("a", ok_stage("a")),
        ("b", fail_stage("b")),
        ("c", ok_stage("c")),
    ]
    run = orchestrator.run(stages, {})
    assert run.ran() == ("a", "b") and not run.completed


# --- seams (reqs 18, 19) -------------------------------------------------------------------------


def test_ci_and_distributed_seams_unimplemented() -> None:
    with pytest.raises(NotImplementedError, match="RV-18"):
        GithubActionsCiSeam().run_stage("static")
    with pytest.raises(NotImplementedError, match="RV-18"):
        XdistDistributedSeam().dispatch(2, ["t1"])
