"""Capability discovery (owner req 7) — declarative. A provider advertises its capabilities via
``capabilities()``; discovery checks set membership and never inspects the class or its name.
"""

from __future__ import annotations

from app.core.providers.base import Capability, Provider
from app.core.providers.errors import UnsupportedCapabilityError


def supports(provider: Provider, capability: Capability) -> bool:
    """True if ``provider`` declares ``capability``."""
    return capability in provider.capabilities()


def require(provider: Provider, *capabilities: Capability) -> None:
    """Raise ``UnsupportedCapabilityError`` unless ``provider`` declares every capability."""
    declared = provider.capabilities()
    missing = [cap for cap in capabilities if cap not in declared]
    if missing:
        names = ", ".join(cap.value for cap in missing)
        raise UnsupportedCapabilityError(
            f"provider {provider.name!r} lacks capability: {names}", provider=provider.name
        )
