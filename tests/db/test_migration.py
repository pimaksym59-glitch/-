"""Offline checks for the Alembic setup (§R12.6). No database — applying migrations is
Runtime Verification Pending.
"""

from __future__ import annotations

from alembic.config import Config
from alembic.script import ScriptDirectory


def test_single_head_is_bootstrap_owner() -> None:
    script = ScriptDirectory.from_config(Config("alembic.ini"))
    assert script.get_heads() == ["0002"]


def test_initial_revision_has_no_down_revision() -> None:
    script = ScriptDirectory.from_config(Config("alembic.ini"))
    revision = script.get_revision("0001")
    assert revision is not None
    assert revision.down_revision is None


def test_bootstrap_owner_revises_initial() -> None:
    script = ScriptDirectory.from_config(Config("alembic.ini"))
    revision = script.get_revision("0002")
    assert revision is not None
    assert revision.down_revision == "0001"
