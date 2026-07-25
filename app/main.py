"""API entrypoint (§R3.5): ``uvicorn app.main:app``. The module-level ``app`` is built by the
factory; importing it opens no connections (lazy infrastructure). Serving over a real ASGI server is
Runtime Verification Pending (RV-9).
"""

from __future__ import annotations

from app.api.app import create_app

app = create_app()
