"""Architecture guard: enforce the layer dependency direction of MASTER_SPEC §R3.1.

    api -> services -> (domain, repositories) -> models/db

Dependencies flow strictly downward; cycles are forbidden. At Stage 1 modules are
import-free, so this passes as a scaffold that catches drift in later stages.
"""

from __future__ import annotations

import ast
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parent.parent / "app"

DOMAIN_PACKAGES: frozenset[str] = frozenset(
    {
        "content",
        "images",
        "llm",
        "telegram",
        "memory",
        "rag",
        "validators",
        "analytics",
        "notifications",
    }
)

# layer -> forbidden import prefixes (external libs and app-internal packages).
FORBIDDEN: dict[str, tuple[str, ...]] = {
    "api": ("app.repositories", "app.db", "app.models", "sqlalchemy"),
    "services": ("app.api", "fastapi"),
    "domain": ("app.api", "app.services", "app.repositories", "app.db", "fastapi"),
    "repositories": ("app.api", "app.services", "fastapi"),
    "utils": (
        "app.api",
        "app.services",
        "app.repositories",
        "app.db",
        "app.models",
        "fastapi",
        "sqlalchemy",
    ),
}


def _layer_of(path: Path) -> str | None:
    """Map a module path to its architectural layer, or None if unconstrained."""
    rel = path.relative_to(APP_ROOT)
    if not rel.parts:
        return None
    top = rel.parts[0]
    if top in ("api", "services", "repositories", "utils"):
        return top
    if top in DOMAIN_PACKAGES:
        return "domain"
    return None  # models, db, core, schemas, scheduler, workers, middleware


def _imported_modules(tree: ast.Module) -> list[str]:
    names: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            names.extend(alias.name for alias in node.names)
        elif (
            isinstance(node, ast.ImportFrom) and node.level == 0 and node.module is not None
        ):  # absolute imports only
            names.append(node.module)
    return names


def _is_forbidden(module: str, forbidden: tuple[str, ...]) -> bool:
    return any(module == f or module.startswith(f + ".") for f in forbidden)


def test_layer_dependency_direction() -> None:
    violations: list[str] = []
    for py in sorted(APP_ROOT.rglob("*.py")):
        layer = _layer_of(py)
        if layer is None:
            continue
        forbidden = FORBIDDEN[layer]
        tree = ast.parse(py.read_text(encoding="utf-8"))
        for module in _imported_modules(tree):
            if _is_forbidden(module, forbidden):
                violations.append(
                    f"{py.relative_to(APP_ROOT)} ({layer}) imports forbidden '{module}'"
                )
    assert not violations, "Layer violations (§R3.1):\n" + "\n".join(violations)
