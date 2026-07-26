"""Provider management (owner reqs 8, 11) — an independent service over a public registry port.

Providers are read through a :class:`ProviderRegistryPort` (adapted to the Provider Layer's
public registry in composition); the API-key reference is a secret and never exposed in views.
Read requires PROVIDERS_READ; managing keys requires PROVIDERS_MANAGE (owner only, §R10.5).
Real provider health I/O is RV.

"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

from app.admin.authorization import RbacAuthorization
from app.admin.dto import ProviderRecord, ProviderView
from app.admin.mapping import to_provider_view
from app.admin.rbac import Permission
from app.admin.types import AdminActor


class ProviderRegistryPort(Protocol):
    """Read port for the provider registry (adapted to the Provider Layer in composition)."""

    def list_providers(self) -> Sequence[ProviderRecord]: ...


class ProviderService:
    """Independent provider-management service (§R10.5)."""

    def __init__(self, port: ProviderRegistryPort, authz: RbacAuthorization) -> None:
        self._port = port
        self._authz = authz

    def list_providers(self, actor: AdminActor) -> tuple[ProviderView, ...]:
        """List providers with capabilities/health, without api-key refs (requires
        PROVIDERS_READ)."""

        self._authz.require(actor, Permission.PROVIDERS_READ)
        records = sorted(self._port.list_providers(), key=lambda r: r.name)
        return tuple(to_provider_view(record) for record in records)
