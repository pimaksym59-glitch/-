"""Contract test architecture (owner req 22, §R2.10) — fakes conform to public Protocols.

``ProtocolConformance`` structurally checks that an object provides every member declared by a
Protocol, using ``typing.get_protocol_members`` — it never touches internal implementations
(owner req 22). Contract tests register ``(fake, Protocol)`` pairs and assert conformance
offline.

"""

from __future__ import annotations

from typing import get_protocol_members, is_protocol


class ProtocolConformance:
    """Structural conformance checker for ``(object, Protocol)`` pairs (owner req 22)."""

    def missing_members(self, obj: object, protocol: type) -> tuple[str, ...]:
        """Return Protocol members absent from ``obj`` (empty tuple → conforms)."""

        if not is_protocol(protocol):
            raise TypeError(f"{protocol!r} is not a Protocol")
        members = get_protocol_members(protocol)
        return tuple(sorted(name for name in members if not hasattr(obj, name)))

    def conforms(self, obj: object, protocol: type) -> bool:
        """True iff ``obj`` provides every member of ``protocol``."""

        return not self.missing_members(obj, protocol)
