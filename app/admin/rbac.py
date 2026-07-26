"""RBAC model (owner reqs 5, 6) — a standalone immutable role/permission model.

Roles and permissions are typed enums (no string literals, owner req 5); the permission matrix
mirrors §R10.5 and the RBAC matrix in ``API_SPEC.md``. Authorization decisions
(``app/admin/authorization.py``) are made *only* through this model — never in the UI (§R10.5,
backend RBAC).

"""

from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from types import MappingProxyType


class Role(StrEnum):
    """The five admin roles (§R10.5)."""

    owner = "owner"
    admin = "admin"
    editor = "editor"
    analyst = "analyst"
    viewer = "viewer"


class Permission(StrEnum):
    """Capability checked by the authorization policy (backend RBAC, §R10.5)."""

    CHANNELS_READ = "channels.read"
    CHANNELS_WRITE = "channels.write"
    PERSONAS_READ = "personas.read"
    PERSONAS_WRITE = "personas.write"
    PROMPTS_READ = "prompts.read"
    PROMPTS_WRITE = "prompts.write"
    CONTENT_WRITE = "content.write"
    SCHEDULER_MANAGE = "scheduler.manage"
    JOBS_READ = "jobs.read"
    ANALYTICS_READ = "analytics.read"
    METRICS_READ = "metrics.read"
    HEALTH_READ = "health.read"
    ERRORS_READ = "errors.read"
    AUDIT_READ = "audit.read"
    USERS_MANAGE = "users.manage"
    PROVIDERS_READ = "providers.read"
    PROVIDERS_MANAGE = "providers.manage"
    CONFIG_READ = "config.read"
    CONFIG_WRITE = "config.write"
    FEATURE_FLAGS_MANAGE = "feature_flags.manage"
    AISTUDIO_USE = "ai_studio.use"


_ALL = (Role.owner, Role.admin, Role.editor, Role.analyst, Role.viewer)
_STAFF = (Role.owner, Role.admin, Role.editor)
_OPS = (Role.owner, Role.admin)

# Permission -> roles that hold it (§R10.5 / API_SPEC RBAC matrix). Read-only.
_MATRIX: dict[Permission, frozenset[Role]] = {
    Permission.CHANNELS_READ: frozenset(_ALL),
    Permission.CHANNELS_WRITE: frozenset(_OPS),
    Permission.PERSONAS_READ: frozenset(_ALL),
    Permission.PERSONAS_WRITE: frozenset(_STAFF),
    Permission.PROMPTS_READ: frozenset(_ALL),
    Permission.PROMPTS_WRITE: frozenset(_STAFF),
    Permission.CONTENT_WRITE: frozenset(_STAFF),
    Permission.SCHEDULER_MANAGE: frozenset(_OPS),
    Permission.JOBS_READ: frozenset(_OPS),
    Permission.ANALYTICS_READ: frozenset(_ALL),
    Permission.METRICS_READ: frozenset(_ALL),
    Permission.HEALTH_READ: frozenset(_OPS),
    Permission.ERRORS_READ: frozenset(_OPS),
    Permission.AUDIT_READ: frozenset((Role.owner, Role.admin, Role.analyst)),
    Permission.USERS_MANAGE: frozenset((Role.owner,)),
    Permission.PROVIDERS_READ: frozenset(_OPS),
    Permission.PROVIDERS_MANAGE: frozenset((Role.owner,)),
    Permission.CONFIG_READ: frozenset(_OPS),
    Permission.CONFIG_WRITE: frozenset(_OPS),
    Permission.FEATURE_FLAGS_MANAGE: frozenset(_OPS),
    Permission.AISTUDIO_USE: frozenset(_STAFF),
}

PERMISSION_MATRIX: Mapping[Permission, frozenset[Role]] = MappingProxyType(_MATRIX)
"""Immutable role/permission matrix (§R10.5)."""


def has_permission(role: Role, permission: Permission) -> bool:
    """True iff ``role`` holds ``permission`` in the matrix. Unknown permission → deny."""

    return role in PERMISSION_MATRIX.get(permission, frozenset())
