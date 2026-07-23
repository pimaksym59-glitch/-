"""Offline checks for the Alembic setup (§R12.6). No database — applying migrations is
Runtime Verification Pending.
"""

from __future__ import annotations

from alembic.config import Config
from alembic.script import ScriptDirectory


def test_single_head_is_initial() -> None:
    script = ScriptDirectory.from_config(Config("alembic.ini"))
    assert script.get_heads() == ["0001"]


def test_initial_revision_has_no_down_revision() -> None:
    script = ScriptDirectory.from_config(Config("alembic.ini"))
    revision = script.get_revision("0001")
    assert revision is not None
    assert revision.down_revision is None
