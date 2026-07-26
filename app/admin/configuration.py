"""Configuration management (owner reqs 8, 11) — an independent service with versioning (§R10.8).

Config is read/written through a :class:`ConfigStore` port; secret values are masked in views
(mapping layer). Every change appends a :class:`~app.admin.dto.ConfigVersionView`-style
snapshot so config can be compared/rolled back (§R10.8) — the snapshot is data/decision here;
real persistence is composition/RV-17. Reads require CONFIG_READ; writes require CONFIG_WRITE
(owner/admin, §R10.5).

"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

from app.admin.authorization import RbacAuthorization
from app.admin.dto import ConfigRecord, ConfigVersionView, ConfigView
from app.admin.mapping import to_config_view
from app.admin.ports import Clock
from app.admin.rbac import Permission
from app.admin.types import AdminActor


class ConfigStore(Protocol):
    """Persistence port for configuration + version snapshots (real backend is RV-17)."""

    def list_config(self) -> Sequence[ConfigRecord]: ...

    def get(self, key: str) -> ConfigRecord | None: ...

    def put(self, record: ConfigRecord) -> None: ...

    def add_version(self, version: ConfigVersionView) -> None: ...

    def versions(self) -> Sequence[ConfigVersionView]: ...


class ConfigService:
    """Independent configuration-management service with versioning (§R10.8)."""

    def __init__(self, store: ConfigStore, authz: RbacAuthorization, clock: Clock) -> None:
        self._store = store
        self._authz = authz
        self._clock = clock

    def list_config(self, actor: AdminActor) -> tuple[ConfigView, ...]:
        """List config with secret values masked (requires CONFIG_READ)."""

        self._authz.require(actor, Permission.CONFIG_READ)
        records = sorted(self._store.list_config(), key=lambda r: r.key)
        return tuple(to_config_view(record) for record in records)

    def set_value(
        self,
        actor: AdminActor,
        key: str,
        value: str,
        *,
        scope: str = "global",
        secret: bool = False,
    ) -> ConfigView:
        """Set a config value and append a version snapshot (requires CONFIG_WRITE, §R10.8)."""

        self._authz.require(actor, Permission.CONFIG_WRITE)
        record = ConfigRecord(key=key, value=value, scope=scope, secret=secret)
        self._store.put(record)
        next_version = len(list(self._store.versions())) + 1
        self._store.add_version(
            ConfigVersionView(
                version=next_version,
                author=actor.id,
                description=f"set {key}",
                created_at=self._clock.now(),
            )
        )
        return to_config_view(record)

    def history(self, actor: AdminActor) -> tuple[ConfigVersionView, ...]:
        """Return config version snapshots, newest first (requires CONFIG_READ, §R10.8)."""

        self._authz.require(actor, Permission.CONFIG_READ)
        return tuple(sorted(self._store.versions(), key=lambda v: v.version, reverse=True))
