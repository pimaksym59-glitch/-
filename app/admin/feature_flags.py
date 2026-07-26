"""Feature flags (owner req 9) — a standalone component with a rollout extension seam.

Flags are stored/evaluated through a :class:`FeatureFlagStore` port; evaluation is
deterministic. A :class:`RolloutStrategy` seam is declared for future percentage/targeted
rollout but **not implemented** (owner req 9 — extension point only, RV-17).

"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol

from app.admin.authorization import RbacAuthorization
from app.admin.rbac import Permission
from app.admin.types import AdminActor


@dataclass(frozen=True, slots=True)
class FeatureFlag:
    """An immutable feature flag."""

    name: str
    enabled: bool
    description: str | None = None


class FeatureFlagStore(Protocol):
    """Persistence port for feature flags (real backend is RV-17)."""

    def list_flags(self) -> Sequence[FeatureFlag]: ...

    def get(self, name: str) -> FeatureFlag | None: ...

    def set(self, flag: FeatureFlag) -> None: ...


class RolloutStrategy(Protocol):
    """Seam for future gradual rollout (percentage/targeted). Not implemented this stage (RV-17)."""

    def should_enable(self, flag: FeatureFlag, subject: str) -> bool: ...


class PercentageRollout(RolloutStrategy):
    """Rollout seam placeholder — declared, not implemented (owner req 9, RV-17)."""

    implemented = False

    def should_enable(self, flag: FeatureFlag, subject: str) -> bool:
        raise NotImplementedError("gradual rollout is Runtime Verification Pending (RV-17)")


class FeatureFlagService:
    """Lists/reads/toggles flags and evaluates them deterministically — RBAC-gated for writes."""

    def __init__(self, store: FeatureFlagStore, authz: RbacAuthorization) -> None:
        self._store = store
        self._authz = authz

    def list_flags(self) -> tuple[FeatureFlag, ...]:
        return tuple(sorted(self._store.list_flags(), key=lambda f: f.name))

    def is_enabled(self, name: str) -> bool:
        """Deterministic evaluation: unknown flags are disabled."""

        flag = self._store.get(name)
        return flag is not None and flag.enabled

    def set_enabled(self, actor: AdminActor, name: str, *, enabled: bool) -> FeatureFlag:
        """Toggle a flag (requires FEATURE_FLAGS_MANAGE)."""

        self._authz.require(actor, Permission.FEATURE_FLAGS_MANAGE)
        existing = self._store.get(name)
        flag = FeatureFlag(
            name=name,
            enabled=enabled,
            description=existing.description if existing is not None else None,
        )
        self._store.set(flag)
        return flag
