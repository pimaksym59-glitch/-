"""Single seed infrastructure (owner req 6) — the one source every generator must use.

``SeedManager`` derives stable per-label sub-seeds from one base seed via SHA-256 (not the
salted builtin ``hash``), so all generated data is reproducible across runs and processes. No
``random``/time (owner req 21). Generators (``data.py``), factories and strategies take a
``SeedManager`` and never seed themselves.

"""

from __future__ import annotations

import hashlib


class SeedManager:
    """Deterministic seed source: one base seed, stable per-label derivation (owner req 6)."""

    def __init__(self, seed: int = 0) -> None:
        self._seed = seed

    @property
    def seed(self) -> int:
        """The base seed."""

        return self._seed

    def derive(self, label: str) -> int:
        """A stable 64-bit sub-seed for ``label`` (same base+label → same value, always)."""

        digest = hashlib.sha256(f"{self._seed}:{label}".encode()).digest()
        return int.from_bytes(digest[:8], "big")

    def child(self, label: str) -> SeedManager:
        """A derived :class:`SeedManager` scoped under ``label`` (for nested deterministic
        scopes)."""

        return SeedManager(self.derive(label))
