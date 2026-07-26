"""Registers the fixtures subsystem for tests under ``tests/framework`` (owner req 4).

Importing the fixture callables into a conftest makes them available to sibling test modules as
pytest fixtures without those modules importing (and shadowing) the names.
"""

from __future__ import annotations

from tests.framework.fixtures import (  # noqa: F401 — re-exported as pytest fixtures
    admin_api,
    analytics_engine,
    clock,
    pipeline_env,
    seed_manager,
)
