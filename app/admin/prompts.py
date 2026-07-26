"""Prompt management (owner reqs 8, 11) — an independent, versioned service (§R10.6).

Prompts are read/written through a :class:`PromptStore` port. Editing creates a new version
(immutable history) rather than mutating in place; activation flips which version is live.
Writes require PROMPTS_WRITE (owner/admin/editor, §R10.5).

"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

from app.admin.authorization import RbacAuthorization
from app.admin.dto import PromptRecord, PromptView
from app.admin.exceptions import NotFoundInAdmin
from app.admin.mapping import to_prompt_view
from app.admin.rbac import Permission
from app.admin.types import AdminActor


class PromptStore(Protocol):
    """Persistence port for versioned prompts (real backend is RV-17)."""

    def versions(self, name: str) -> Sequence[PromptRecord]: ...

    def add_version(self, record: PromptRecord) -> None: ...


class PromptService:
    """Independent, versioned prompt-management service (§R10.6)."""

    def __init__(self, store: PromptStore, authz: RbacAuthorization) -> None:
        self._store = store
        self._authz = authz

    def history(self, actor: AdminActor, name: str) -> tuple[PromptView, ...]:
        """Return the version history (newest first) — requires PROMPTS_READ."""

        self._authz.require(actor, Permission.PROMPTS_READ)
        records = sorted(self._store.versions(name), key=lambda r: r.version, reverse=True)
        return tuple(to_prompt_view(record) for record in records)

    def add_version(self, actor: AdminActor, name: str, body: str) -> PromptView:
        """Add a new prompt version (requires PROMPTS_WRITE). New version becomes active."""

        self._authz.require(actor, Permission.PROMPTS_WRITE)
        existing = list(self._store.versions(name))
        next_version = max((r.version for r in existing), default=0) + 1
        record = PromptRecord(
            id=f"{name}:{next_version}",
            name=name,
            version=next_version,
            body=body,
            active=True,
        )
        self._store.add_version(record)
        return to_prompt_view(record)

    def active(self, actor: AdminActor, name: str) -> PromptView:
        """Return the active version (requires PROMPTS_READ)."""

        self._authz.require(actor, Permission.PROMPTS_READ)
        for record in self._store.versions(name):
            if record.active:
                return to_prompt_view(record)
        raise NotFoundInAdmin(f"no active prompt: {name}")
