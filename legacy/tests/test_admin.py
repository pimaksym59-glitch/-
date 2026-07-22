"""Admin API: route wiring + auth gating (no DB required)."""

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

import admin.security as security
from app.config import Settings
from app.main import app


def test_admin_routes_registered():
    with TestClient(app) as client:
        paths = client.get("/openapi.json").json()["paths"]
    assert "/admin/personas" in paths
    assert "/admin/channels" in paths
    assert "/admin/channels/{channel_id}/generate" in paths
    assert "/admin/channels/{channel_id}/analytics" in paths
    assert "/admin/knowledge-bases/{kb_id}/documents" in paths
    assert "/admin/tasks" in paths


def test_admin_ui_served():
    with TestClient(app) as client:
        resp = client.get("/admin/ui")
    assert resp.status_code == 200
    assert "text/html" in resp.headers["content-type"]
    assert "AI Telegram" in resp.text  # the dashboard shell rendered


def test_admin_disabled_without_token(monkeypatch):
    # With no token configured, the admin API returns 503 before any DB call.
    # Patch the settings the dependency reads so the result is independent of
    # any ambient .env in the working directory.
    monkeypatch.setattr(security, "get_settings", lambda: Settings(admin_token=None))
    with TestClient(app) as client:
        resp = client.get("/admin/personas")
    assert resp.status_code == 503


async def test_require_admin_token_logic(monkeypatch):
    monkeypatch.setattr(security, "get_settings", lambda: Settings(admin_token="secret"))
    await security.require_admin(x_admin_token="secret")  # correct token → passes

    with pytest.raises(HTTPException) as exc:
        await security.require_admin(x_admin_token="wrong")
    assert exc.value.status_code == 401

    monkeypatch.setattr(security, "get_settings", lambda: Settings(admin_token=None))
    with pytest.raises(HTTPException) as exc2:
        await security.require_admin(x_admin_token="anything")
    assert exc2.value.status_code == 503
