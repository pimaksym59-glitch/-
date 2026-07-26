"""Test fixtures subsystem (owner req 4) — reusable environments, separate from factories.

Fixtures assemble ready-to-use offline subsystems through **public** composition builders
(owner req 3): ``build_analytics_engine`` / ``build_admin_api`` / Telegram fakes. They depend
on factories/data but never the reverse (owner req 4). Both plain builder functions and pytest
fixtures are provided; importing a pytest fixture into a test module registers it there.

"""

from __future__ import annotations

from dataclasses import dataclass

import pytest

from app.admin.service import AdminApi
from app.analytics.engine import AnalyticsEngine
from app.services.admin import build_admin_api
from app.services.analytics import build_analytics_engine
from app.telegram.fakes import FakeTelegramProvider
from tests.framework.data import DeterministicClock
from tests.framework.seed import SeedManager


@dataclass(frozen=True, slots=True)
class PipelineEnv:
    """A bundle of offline subsystems for E2E pipeline scenarios."""

    seeds: SeedManager
    analytics: AnalyticsEngine
    telegram: FakeTelegramProvider


def new_seed_manager(seed: int = 0) -> SeedManager:
    """A fresh deterministic seed manager (owner req 6)."""

    return SeedManager(seed)


def build_analytics_env() -> AnalyticsEngine:
    """An offline analytics engine via the public builder."""

    return build_analytics_engine()


def build_admin_env() -> AdminApi:
    """An offline admin API via the public builder."""

    return build_admin_api()


def build_pipeline_env(seed: int = 0) -> PipelineEnv:
    """A bundled offline environment for the 5-stage pipeline (§R13.2)."""

    return PipelineEnv(
        seeds=SeedManager(seed),
        analytics=build_analytics_engine(),
        telegram=FakeTelegramProvider(),
    )


@pytest.fixture
def seed_manager() -> SeedManager:
    return new_seed_manager()


@pytest.fixture
def clock() -> DeterministicClock:
    return DeterministicClock()


@pytest.fixture
def analytics_engine() -> AnalyticsEngine:
    return build_analytics_env()


@pytest.fixture
def admin_api() -> AdminApi:
    return build_admin_env()


@pytest.fixture
def pipeline_env() -> PipelineEnv:
    return build_pipeline_env()
