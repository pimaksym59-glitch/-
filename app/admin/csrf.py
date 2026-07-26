"""CSRF Strategy (owner reqs 7, 8) — a standalone strategy, separate from session management.

Tokens come from an injected :class:`~app.admin.ports.TokenFactory` (deterministic, owner req
20). The strategy only *issues* and *validates* tokens; binding them to cookies/headers over
the wire is a Web UI seam (RV-17). Two interchangeable strategies are provided.

"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from app.admin.ports import TokenFactory


@dataclass(frozen=True, slots=True)
class CsrfToken:
    """An immutable CSRF token."""

    value: str


class CsrfStrategy(Protocol):
    """Issues and validates CSRF tokens (owner req 8)."""

    def issue(self) -> CsrfToken: ...

    def validate(self, expected: CsrfToken, provided: str) -> bool: ...


class DoubleSubmitCsrf(CsrfStrategy):
    """Double-submit strategy: the token is compared against the value echoed back by the client."""

    def __init__(self, tokens: TokenFactory) -> None:
        self._tokens = tokens

    def issue(self) -> CsrfToken:
        return CsrfToken(value=self._tokens.new_token())

    def validate(self, expected: CsrfToken, provided: str) -> bool:
        return bool(provided) and provided == expected.value


class SynchronizerTokenCsrf(CsrfStrategy):
    """Synchronizer-token strategy: a per-session token issued once and matched on each mutation."""

    def __init__(self, tokens: TokenFactory) -> None:
        self._tokens = tokens

    def issue(self) -> CsrfToken:
        return CsrfToken(value=self._tokens.new_token())

    def validate(self, expected: CsrfToken, provided: str) -> bool:
        return bool(provided) and provided == expected.value
