"""Extension seams (owner reqs 17, 18) — declared, not implemented (RV-17).

Future Web UI (FastAPI/HTMX/SPA/external admin UI) and external identity providers
(OAuth/OIDC/LDAP/SAML/ MFA) are declared here as Protocols/placeholders so wiring points exist,
but **nothing is implemented** and no web/SSO SDK is imported. Every call raises
``NotImplementedError`` (RV-17).

"""

from __future__ import annotations

from typing import Protocol

from app.admin.authentication import AuthOutcome

_RV17 = "Runtime Verification Pending (RV-17): no real Web UI / SSO in this stage"


class WebUiRenderer(Protocol):
    """Seam for a future server-rendered Web UI (FastAPI/HTMX) or SPA bridge (owner req 17)."""

    def render(self, view_name: str, context: object) -> str: ...


class SsoProvider(Protocol):
    """Seam for external identity providers — OAuth/OIDC/LDAP/SAML (owner req 18)."""

    def begin(self, redirect_uri: str) -> str: ...

    def complete(self, callback_params: object) -> AuthOutcome: ...


class HtmxUiRenderer(WebUiRenderer):
    """Web UI seam placeholder — declared, not implemented (owner req 17, RV-17)."""

    implemented = False

    def render(self, view_name: str, context: object) -> str:
        raise NotImplementedError(_RV17)


class OidcSsoProvider(SsoProvider):
    """External SSO seam placeholder — declared, not implemented (owner req 18, RV-17)."""

    implemented = False

    def begin(self, redirect_uri: str) -> str:
        raise NotImplementedError(_RV17)

    def complete(self, callback_params: object) -> AuthOutcome:
        raise NotImplementedError(_RV17)


class ExternalMfaProvider:
    """External MFA seam placeholder — declared, not implemented (owner req 18, RV-17)."""

    implemented = False

    def verify(self, secret_ref: str, otp: str) -> bool:
        raise NotImplementedError(_RV17)
