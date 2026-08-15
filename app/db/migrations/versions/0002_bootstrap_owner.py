"""bootstrap owner — seed exactly one owner user on an empty users table (§R10.5)

Stage 21 Phase 1. Runs after 0001_initial. Reads BOOTSTRAP_OWNER_EMAIL/BOOTSTRAP_OWNER_PASSWORD
from the environment ONLY when the users table is empty; the plaintext password is hashed via the
real BcryptPasswordHasher before insert and is never itself written to the database or logged. A
non-empty users table makes this a no-op — safe to re-run on every subsequent `alembic upgrade
head`, on a fresh database or an already-bootstrapped one alike. Requires a live PostgreSQL —
applying this is Runtime Verification Pending in environments without a database (mirrors
0001_initial's own note).

Downgrade is intentionally conservative: it only removes a row if the table holds EXACTLY one user
matching BOOTSTRAP_OWNER_EMAIL — it never risks deleting a legitimately-created later owner just
because the same email happens to be set in the environment.

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-11
"""

from __future__ import annotations

import os

from alembic import op
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import BcryptPasswordHasher
from app.models.enums import UserRole
from app.models.user import User

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels = None
depends_on = None

_EMAIL_VAR = "BOOTSTRAP_OWNER_EMAIL"
_PASSWORD_VAR = "BOOTSTRAP_OWNER_PASSWORD"


def upgrade() -> None:
    session = Session(bind=op.get_bind())
    try:
        if session.scalar(select(User.id).limit(1)) is not None:
            return  # users already exist — no-op, safe to re-run
        email = os.environ.get(_EMAIL_VAR)
        password = os.environ.get(_PASSWORD_VAR)
        if not email or not password:
            raise RuntimeError(
                f"users table is empty and bootstrap is required: set {_EMAIL_VAR} and "
                f"{_PASSWORD_VAR} to seed the first owner (§R10.5). Neither value is logged."
            )
        owner = User(
            email=email,
            role=UserRole.owner,
            password_hash=BcryptPasswordHasher().hash(password),
            status="active",
        )
        session.add(owner)
        session.commit()
    finally:
        session.close()


def downgrade() -> None:
    session = Session(bind=op.get_bind())
    try:
        email = os.environ.get(_EMAIL_VAR)
        if not email:
            return
        users = list(session.scalars(select(User)))
        if len(users) == 1 and users[0].email == email:
            session.delete(users[0])
            session.commit()
    finally:
        session.close()
