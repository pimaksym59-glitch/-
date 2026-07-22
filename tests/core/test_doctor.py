"""Unit tests for the config doctor (`python -m app doctor`). Config-only, offline."""

from __future__ import annotations

from pathlib import Path

import pytest

import app.__main__ as cli
from app.core import config as cfg
from app.core.config import Settings


def _isolate(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Isolate doctor config: empty yaml dir, no real .env, fresh (uncached) settings."""
    monkeypatch.setattr(cfg, "CONFIG_DIR", tmp_path)
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    monkeypatch.setattr(cfg, "get_settings", Settings)


def test_doctor_runs_and_exits_zero(
    capsys: pytest.CaptureFixture[str], monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    _isolate(monkeypatch, tmp_path)
    rc = cli.doctor()
    out = capsys.readouterr().out
    assert rc == 0
    assert "Configuration doctor" in out
    assert "openai configured" in out


def test_doctor_reports_configured_vs_missing(
    capsys: pytest.CaptureFixture[str], monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    _isolate(monkeypatch, tmp_path)
    monkeypatch.setenv("OPENAI_API_KEY", "x")
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    cli.doctor()
    out = capsys.readouterr().out
    ok, bad = cli._marks()
    openai_line = next(line for line in out.splitlines() if "openai configured" in line)
    anthropic_line = next(line for line in out.splitlines() if "anthropic configured" in line)
    assert ok in openai_line
    assert bad in anthropic_line


def test_doctor_does_not_leak_secret(
    capsys: pytest.CaptureFixture[str], monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    _isolate(monkeypatch, tmp_path)
    monkeypatch.setenv("OPENAI_API_KEY", "super-secret")
    cli.doctor()
    assert "super-secret" not in capsys.readouterr().out


def test_main_doctor_command(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    _isolate(monkeypatch, tmp_path)
    assert cli.main(["doctor"]) == 0


def test_main_no_command_returns_one(capsys: pytest.CaptureFixture[str]) -> None:
    assert cli.main([]) == 1
