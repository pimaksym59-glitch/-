"""Architectural-invariant guard for the Admin subsystem (owner reqs 1, 24).

Asserts that ``app/admin`` is a fully independent domain: it must not import FastAPI/Starlette, the
other engines/subsystems (AI/Validation/Image/Telegram/Analytics/Memory/RAG), the queue/provider
implementations, or the web/service/persistence layers. Reinforces ``tests/test_layering.py``.
"""

from __future__ import annotations

import ast
from pathlib import Path

ADMIN_ROOT = Path(__file__).resolve().parent.parent.parent / "app" / "admin"

FORBIDDEN_PREFIXES: tuple[str, ...] = (
    "fastapi",
    "starlette",
    "app.content",
    "app.validators",
    "app.images",
    "app.telegram",
    "app.analytics",
    "app.memory",
    "app.rag",
    "app.workers",
    "app.core.providers",
    "app.api",
    "app.services",
    "app.db",
    "app.repositories",
    "app.models",
    "app.scheduler",
    "sqlalchemy",
)


def _imported_modules(tree: ast.Module) -> list[str]:
    names: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            names.extend(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module is not None:
            names.append(node.module)
    return names


def _is_forbidden(module: str) -> bool:
    return any(module == p or module.startswith(p + ".") for p in FORBIDDEN_PREFIXES)


def test_admin_domain_has_no_forbidden_imports() -> None:
    violations: list[str] = []
    for py in sorted(ADMIN_ROOT.rglob("*.py")):
        tree = ast.parse(py.read_text(encoding="utf-8"))
        for module in _imported_modules(tree):
            if _is_forbidden(module):
                violations.append(f"{py.name} imports forbidden '{module}'")
    assert not violations, "Admin independence violations:\n" + "\n".join(violations)


def test_admin_imports_only_stdlib_or_self() -> None:
    """Every ``app.*`` import inside the domain must stay within ``app.admin``."""

    violations: list[str] = []
    for py in sorted(ADMIN_ROOT.rglob("*.py")):
        tree = ast.parse(py.read_text(encoding="utf-8"))
        for module in _imported_modules(tree):
            if module.startswith("app.") and not module.startswith("app.admin"):
                violations.append(f"{py.name} imports non-admin app module '{module}'")
    assert not violations, "Admin cross-package imports:\n" + "\n".join(violations)
