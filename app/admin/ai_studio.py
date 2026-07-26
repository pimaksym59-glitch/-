"""AI Studio (§R10.9) — an isolated dry-run/compare service.

By construction AI Studio has **no** ports that write channel memory or publish (§R10.9): it
depends only on a read-only :class:`DryRunPort`. It estimates cost / compares prompts without
side effects; a live run against real LLMs is RV. Requires AISTUDIO_USE (owner/admin/editor,
§R10.5).

"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol

from app.admin.authorization import RbacAuthorization
from app.admin.rbac import Permission
from app.admin.types import AdminActor


@dataclass(frozen=True, slots=True)
class DryRunResult:
    """An isolated dry-run outcome: preview text + estimated cost (no side effects)."""

    model: str
    preview: str
    estimated_cost_usd: float


class DryRunPort(Protocol):
    """Read-only dry-run port (adapted to AI Engine dry-run in composition — never
    writes/publishes)."""

    def dry_run(self, prompt: str, model: str) -> DryRunResult: ...


class AiStudioService:
    """Isolated prompt testing/comparison (§R10.9). No memory-write/publish access by
    construction."""

    def __init__(self, port: DryRunPort, authz: RbacAuthorization) -> None:
        self._port = port
        self._authz = authz

    def dry_run(self, actor: AdminActor, prompt: str, model: str) -> DryRunResult:
        """Estimate a single model's output/cost without side effects (requires AISTUDIO_USE)."""

        self._authz.require(actor, Permission.AISTUDIO_USE)
        return self._port.dry_run(prompt, model)

    def compare(
        self, actor: AdminActor, prompt: str, models: Sequence[str]
    ) -> tuple[DryRunResult, ...]:
        """Compare a prompt across models (isolated, no side effects)."""

        self._authz.require(actor, Permission.AISTUDIO_USE)
        return tuple(self._port.dry_run(prompt, model) for model in models)
