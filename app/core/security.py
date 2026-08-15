"""Real password hashing (Stage 21 Phase 0 — closes the `PasswordHasher`/`HashingPasswordHasher`
seam declared in ``app.admin.authentication``/``app.admin.users``, previously satisfied only by
``FakePasswordHasher`` in tests). bcrypt only — no new authentication framework.
"""

from __future__ import annotations

import bcrypt


class BcryptPasswordHasher:
    """Real `PasswordHasher`/`HashingPasswordHasher` implementation via bcrypt."""

    def hash(self, secret: str) -> str:
        return bcrypt.hashpw(secret.encode("utf-8"), bcrypt.gensalt()).decode("ascii")

    def verify(self, secret: str, password_hash: str) -> bool:
        try:
            return bcrypt.checkpw(secret.encode("utf-8"), password_hash.encode("ascii"))
        except ValueError:
            # Malformed/foreign hash format — never a match, never a crash.
            return False
