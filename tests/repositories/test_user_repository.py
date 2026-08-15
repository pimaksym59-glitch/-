"""Offline wiring tests for the user repository and its DTO mapping (§R3.1). No live database —
persistence itself is `tests/repositories/test_user_repository_integration.py`, gated by
RUN_INTEGRATION=1.
"""

from __future__ import annotations

import uuid

from app.admin.rbac import Role
from app.models.enums import UserRole
from app.models.user import User
from app.repositories.base import EntityRepository
from app.repositories.user_repository import UserRepository, role_to_user_role, to_account


def test_user_repository_is_bound_to_the_user_model() -> None:
    assert UserRepository.model is User


def test_user_repository_is_entity_based_with_soft_delete() -> None:
    assert issubclass(UserRepository, EntityRepository)
    assert hasattr(UserRepository, "soft_delete")
    assert hasattr(UserRepository, "list_active")


def test_to_account_maps_a_user_with_a_password_hash() -> None:
    user = User(
        id=uuid.uuid4(),
        email="owner@example.com",
        role=UserRole.owner,
        password_hash="h:secret",
        status="active",
    )
    account = to_account(user)
    assert account is not None
    assert account.id == str(user.id)
    assert account.role is Role.owner
    assert account.password_hash == "h:secret"


def test_to_account_returns_none_without_a_password_hash() -> None:
    # Never fabricate a hash to authenticate against — such a row can never log in.
    user = User(
        id=uuid.uuid4(),
        email="invited@example.com",
        role=UserRole.viewer,
        password_hash=None,
        status="active",
    )
    assert to_account(user) is None


def test_role_to_user_role_round_trips_every_role() -> None:
    for role in Role:
        assert role_to_user_role(role).value == role.value
