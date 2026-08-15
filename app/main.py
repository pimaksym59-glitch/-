"""API entrypoint (§R3.5): ``uvicorn app.main:app``. The module-level ``app`` is built by the
factory; importing it opens no connections (lazy infrastructure). Serving over a real ASGI server is
Runtime Verification Pending (RV-9).

Logging is configured HERE, at the process entrypoint (§R12.9), not inside ``create_app`` — the
factory builds isolated app instances (including one per test) and must not mutate global logging
state. Without this call the records ``RequestLoggingMiddleware`` emits reach no handler at all.
"""

from __future__ import annotations

from app.api.app import create_app
from app.core.logging import configure_logging

configure_logging()
app = create_app()
