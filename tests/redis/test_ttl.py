"""TTL constants (§R3.7): single source, all positive ints. Offline."""

from __future__ import annotations

from app.core.redis import ttl


def test_all_ttls_are_positive_ints() -> None:
    names = [name for name in dir(ttl) if name.isupper()]
    assert names, "no TTL constants found"
    for name in names:
        value = getattr(ttl, name)
        assert isinstance(value, int)
        assert value > 0
