"""Error reporting (§R12.9) — read-only error records through a public port, paginated/filtered.

The admin domain defines :class:`ErrorReportPort`; composition adapts it to the errors source.
The service is read-only (it never mutates error state) and reuses the independent
pagination/filtering components.

"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

from app.admin.authorization import RbacAuthorization
from app.admin.dto import ErrorRecord, ErrorView
from app.admin.filtering import FilterSet, apply_filters
from app.admin.mapping import to_error_view
from app.admin.pagination import Page, PageRequest, paginate
from app.admin.rbac import Permission
from app.admin.types import AdminActor


class ErrorReportPort(Protocol):
    """Read port for error records (§R12.9)."""

    def list_errors(self) -> Sequence[ErrorRecord]: ...


class ErrorReportService:
    """Reads/paginates/filters error records — RBAC-gated, read-only (§R12.9)."""

    def __init__(self, port: ErrorReportPort, authz: RbacAuthorization) -> None:
        self._port = port
        self._authz = authz

    def list_errors(
        self,
        actor: AdminActor,
        request: PageRequest | None = None,
        filters: FilterSet | None = None,
    ) -> Page[ErrorView]:
        """Return a page of error views (requires ERRORS_READ)."""

        self._authz.require(actor, Permission.ERRORS_READ)
        records = self._port.list_errors()
        if filters is not None:
            records = apply_filters(records, filters)
        views = [to_error_view(record) for record in records]
        return paginate(views, request or PageRequest())
