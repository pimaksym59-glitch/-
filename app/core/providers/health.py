"""Provider health status (§R12.10) — a declarative snapshot, **never** a network call. It reports
what the provider knows about itself (configured/ready), so it is cheap and safe to call anywhere.
Real connectivity checks belong to the API readiness probes (Stage 10), not here.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ProviderHealth:
    healthy: bool
    detail: str | None = None
