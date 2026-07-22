"""Stage 1 structural check: every expected package exists and imports cleanly (offline).

Verifies MASTER_SPEC §R3.1 / §R3.2 / §R3.5 layout and Acceptance Criteria Appendix D(b)
(offline import with no side effects). Pure/offline — no DB, no network.
"""

from __future__ import annotations

import importlib
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parent.parent / "app"

EXPECTED_PACKAGES: list[str] = [
    "app",
    # presentation
    "app.api",
    "app.api.v1",
    "app.middleware",
    # application
    "app.services",
    # domain
    "app.llm",
    "app.content",
    "app.images",
    "app.images.providers",
    "app.telegram",
    "app.memory",
    "app.rag",
    "app.validators",
    "app.analytics",
    "app.notifications",
    # data access
    "app.repositories",
    # infrastructure / shared
    "app.models",
    "app.db",
    "app.schemas",
    "app.core",
    "app.scheduler",
    "app.workers",
    "app.utils",
]


def test_expected_packages_exist_on_disk() -> None:
    for pkg in EXPECTED_PACKAGES:
        rel = Path(*pkg.split(".")[1:]) if pkg != "app" else Path()
        init = APP_ROOT / rel / "__init__.py"
        assert init.is_file(), f"missing package __init__.py: {pkg} ({init})"


def test_expected_packages_import_cleanly() -> None:
    for pkg in EXPECTED_PACKAGES:
        importlib.import_module(pkg)  # no side effects, no missing deps at Stage 1


def test_py_typed_marker_present() -> None:
    assert (APP_ROOT / "py.typed").is_file(), "PEP 561 py.typed marker missing (§R3.6)"
