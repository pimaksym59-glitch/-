"""Stage 1 smoke tests: the app boots and the liveness endpoint responds.

Readiness (Postgres/Redis) is covered by integration tests once the data layer
lands in Stage 2; here we keep to a dependency-free unit check.
"""

from fastapi.testclient import TestClient

from app.main import app


def test_health_ok():
    with TestClient(app) as client:
        resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
