"""API lifespan (§R12.4). A single lifespan delegates infrastructure init/teardown to the service
layer (``lifespan_resources``) so the API layer never imports ``app.db`` (§R3.1). Startup is lazy —
no connections are opened here or at import; shutdown disposes resources only if they were created.
Verifying teardown against live connections is Runtime Verification Pending (RV-9).
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.services.lifecycle import lifespan_resources


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    async with lifespan_resources():
        yield
