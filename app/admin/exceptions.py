"""Admin subsystem exception hierarchy (stdlib-only)."""

from __future__ import annotations


class AdminError(Exception):
    """Base class for admin-subsystem errors."""


class PermissionDenied(AdminError):
    """Raised when the authorization policy denies an action (§R10.5)."""


class NotFoundInAdmin(AdminError):
    """Raised when a requested admin entity does not exist."""


class AuthenticationFailed(AdminError):
    """Raised when authentication fails (bad credentials / MFA)."""
