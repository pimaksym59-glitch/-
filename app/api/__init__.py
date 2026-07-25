"""Presentation layer (§R3.1): routes only, no business logic, no SQL. Depends on services.

The application factory (:func:`app.api.app.create_app`) wires middleware, exception handlers and
the versioned router. The API layer reaches infrastructure only through the service layer (§R3.1).
"""

from __future__ import annotations

from app.api.app import create_app

__all__ = ["create_app"]
