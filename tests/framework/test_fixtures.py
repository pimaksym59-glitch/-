"""Exercises the fixtures subsystem as real pytest fixtures + a few remaining branches."""

from __future__ import annotations

from app.admin.service import AdminApi
from app.analytics.engine import AnalyticsEngine
from tests.framework.architecture import TestLevel
from tests.framework.data import SeededGenerator
from tests.framework.fixtures import PipelineEnv
from tests.framework.markers import MarkerRegistry
from tests.framework.pyramid import TestPyramid
from tests.framework.reporting import InMemoryTestReporter, Outcome, TestResult
from tests.framework.seed import SeedManager


def test_seed_manager_fixture(seed_manager: SeedManager) -> None:
    assert seed_manager.seed == 0


def test_clock_fixture(clock: object) -> None:
    assert hasattr(clock, "now")


def test_analytics_engine_fixture(analytics_engine: AnalyticsEngine) -> None:
    analytics_engine.flush_events()  # no exporters wired — must not raise


def test_admin_api_fixture(admin_api: AdminApi) -> None:
    assert admin_api.authorization is not None


def test_pipeline_env_fixture(pipeline_env: PipelineEnv) -> None:
    assert isinstance(pipeline_env.seeds, SeedManager)
    assert pipeline_env.telegram is not None


def test_timestamp_generator_advances() -> None:
    gen = SeededGenerator(SeedManager(0), "ts")
    first = gen.timestamp()
    second = gen.timestamp()
    assert second > first


def test_pyramid_floor_unknown_level_is_zero() -> None:
    assert TestPyramid().floor_for(TestLevel.API) == 0.0


def test_marker_registry_is_known() -> None:
    registry = MarkerRegistry()
    assert registry.is_known("e2e")
    assert not registry.is_known("nope")


def test_reporter_results_accessor() -> None:
    reporter = InMemoryTestReporter()
    reporter.add(TestResult("t", Outcome.PASSED, "unit"))
    assert len(reporter.results()) == 1
