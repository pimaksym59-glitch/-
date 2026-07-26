"""Architectural-invariant tests for the test infrastructure (owner reqs 1, 23, 27).

Confirms: production (``app/``) never imports the test infrastructure; the framework consumes only
public ``app`` surfaces (services builders / ``*.fakes`` / public DTO/Protocol modules); no cycles;
and the production layering guard stays green.
"""

from __future__ import annotations

import ast
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent.parent
APP_ROOT = _ROOT / "app"
FRAMEWORK_ROOT = _ROOT / "tests" / "framework"

# Public app surfaces the framework is allowed to import (owner req 3): services builders, subsystem
# fakes, and public DTO/Protocol/type modules (last path segment allow-list).
_PUBLIC_LAST_SEGMENTS = frozenset(
    {
        "fakes",
        "dto",
        "types",
        "base",
        "rbac",
        "service",
        "events",
        "audit",
        "audit_pipeline",
        "correlation",
        "taxonomy",
        "engine",
        "metrics",
        "authentication",
        "sessions",
    }
)


def _imported_modules(tree: ast.Module) -> list[str]:
    names: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            names.extend(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module is not None:
            names.append(node.module)
    return names


def test_app_does_not_import_tests() -> None:
    """Production code must never depend on the test infrastructure (owner reqs 1, 27)."""

    violations: list[str] = []
    for py in sorted(APP_ROOT.rglob("*.py")):
        tree = ast.parse(py.read_text(encoding="utf-8"))
        for module in _imported_modules(tree):
            if module == "tests" or module.startswith("tests."):
                violations.append(f"{py.relative_to(APP_ROOT)} imports '{module}'")
    assert not violations, "app imports test infrastructure:\n" + "\n".join(violations)


def test_framework_uses_only_public_app_surfaces() -> None:
    """The framework imports app only via services builders / fakes / public types (owner req 3)."""

    violations: list[str] = []
    for py in sorted(FRAMEWORK_ROOT.rglob("*.py")):
        tree = ast.parse(py.read_text(encoding="utf-8"))
        for module in _imported_modules(tree):
            if not module.startswith("app."):
                continue
            if module.startswith("app.services."):
                continue
            if module.split(".")[-1] in _PUBLIC_LAST_SEGMENTS:
                continue
            violations.append(f"{py.name} imports non-public app module '{module}'")
    assert not violations, "framework reaches into app internals:\n" + "\n".join(violations)


def test_layering_guard_still_green() -> None:
    """The production layering guard is unaffected by Stage 19 (owner req 27)."""

    from tests.test_layering import test_layer_dependency_direction

    test_layer_dependency_direction()
