"""Offline unit tests for the real password hasher (Stage 21 Phase 0, §R10.4)."""

from __future__ import annotations

from app.core.security import BcryptPasswordHasher


def test_hash_then_verify_round_trip() -> None:
    hasher = BcryptPasswordHasher()
    stored = hasher.hash("correct horse battery staple")
    assert hasher.verify("correct horse battery staple", stored) is True


def test_verify_rejects_wrong_password() -> None:
    hasher = BcryptPasswordHasher()
    stored = hasher.hash("correct horse battery staple")
    assert hasher.verify("wrong password", stored) is False


def test_hash_never_stores_plaintext() -> None:
    hasher = BcryptPasswordHasher()
    secret = "correct horse battery staple"
    assert secret not in hasher.hash(secret)


def test_verify_rejects_malformed_hash_without_raising() -> None:
    hasher = BcryptPasswordHasher()
    assert hasher.verify("anything", "not-a-real-bcrypt-hash") is False


def test_two_hashes_of_the_same_secret_differ() -> None:
    # bcrypt salts per call — proves hash() is not a bare digest.
    hasher = BcryptPasswordHasher()
    secret = "correct horse battery staple"
    assert hasher.hash(secret) != hasher.hash(secret)
