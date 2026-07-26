"""Test architecture model (§R13, TEST_PLAN) — typed levels and category metadata.

Describes the test levels (Unit/Integration/Contract/API/Migration/E2E) and their
intent/coverage targets as immutable data. Pure model — no execution, no production business
logic (owner req 2).

"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from enum import StrEnum
from types import MappingProxyType


class TestLevel(StrEnum):
    """Test levels of the pyramid (TEST_PLAN §Levels)."""

    __test__ = False  # not a pytest test class

    UNIT = "unit"
    INTEGRATION = "integration"
    CONTRACT = "contract"
    API = "api"
    MIGRATION = "migration"
    E2E = "e2e"


class TestCategory(StrEnum):
    """Whether a level runs offline always, or is gated behind live services (§R3.9/§R12.12)."""

    __test__ = False  # not a pytest test class

    OFFLINE = "offline"
    GATED = "gated"


@dataclass(frozen=True, slots=True)
class TestLevelMeta:
    """Immutable metadata for a test level."""

    __test__ = False  # not a pytest test class

    level: TestLevel
    prefix: str
    category: TestCategory
    intent: str


_META: dict[TestLevel, TestLevelMeta] = {
    TestLevel.UNIT: TestLevelMeta(
        TestLevel.UNIT, "T-U", TestCategory.OFFLINE, "pure domain logic; always in CI"
    ),
    TestLevel.INTEGRATION: TestLevelMeta(
        TestLevel.INTEGRATION, "T-I", TestCategory.GATED, "DB/queue/network paths; RUN_INTEGRATION"
    ),
    TestLevel.CONTRACT: TestLevelMeta(
        TestLevel.CONTRACT, "T-C", TestCategory.OFFLINE, "fakes conform to public Protocols"
    ),
    TestLevel.API: TestLevelMeta(
        TestLevel.API, "T-A", TestCategory.GATED, "endpoints/RBAC/isolation/error codes"
    ),
    TestLevel.MIGRATION: TestLevelMeta(
        TestLevel.MIGRATION, "T-M", TestCategory.GATED, "alembic up/down; expand-contract"
    ),
    TestLevel.E2E: TestLevelMeta(
        TestLevel.E2E, "T-E", TestCategory.OFFLINE, "5-stage pipeline on fakes (§R13.2)"
    ),
}

LEVEL_META: Mapping[TestLevel, TestLevelMeta] = MappingProxyType(_META)


def level_meta(level: TestLevel) -> TestLevelMeta:
    """Return the metadata for a test level."""

    return LEVEL_META[level]
