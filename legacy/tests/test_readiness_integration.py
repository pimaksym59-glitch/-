"""Integration check: /readiness reports Postgres + Redis reachable.

Skipped unless RUN_INTEGRATION=1 and the services are up (e.g. `docker compose
up`). Keeps the default `pytest` run dependency-free while giving a real check
once the data layer is running.
"""

import os

import pytest
from fastapi.testclient import TestClient

from app.main import app

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_INTEGRATION") != "1",
    reason="set RUN_INTEGRATION=1 with Postgres+Redis running",
)


def test_readiness_ok():
    with TestClient(app) as client:
        resp = client.get("/readiness")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ready"
    assert body["checks"] == {"postgres": "ok", "redis": "ok"}
