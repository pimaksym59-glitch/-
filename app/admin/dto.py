"""Admin data-transfer objects (owner reqs 2, 14) — immutable records (store inputs) and views
(outputs).

``*Record`` types are what stores/integration ports return (secret-bearing fields are typed as
such); ``*View`` types are the UI-agnostic outputs and **never carry secrets** (§R10.4). The
mapping between them lives in ``app/admin/mapping.py`` (owner req 14 — a dedicated mapping
layer with mandatory masking).

"""

from __future__ import annotations

import datetime
from dataclasses import dataclass

from app.admin.rbac import Role

# --- users -------------------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class UserRecord:
    """Store record for a user (``password_hash``/``mfa_secret_ref`` are secrets, never exposed)."""

    id: str
    email: str
    role: Role
    status: str
    password_hash: str | None = None
    mfa_secret_ref: str | None = None


@dataclass(frozen=True, slots=True)
class UserView:
    """UI-facing user view — no secret fields (§R10.4)."""

    id: str
    email: str
    role: Role
    status: str
    mfa_enabled: bool


# --- channels ----------------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class ChannelRecord:
    id: str
    title: str
    status: str
    language: str | None = None
    bot_token_ref: str | None = None  # secret reference — never exposed


@dataclass(frozen=True, slots=True)
class ChannelView:
    id: str
    title: str
    status: str
    language: str | None = None


# --- prompts (versioned §R10.6) ----------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class PromptRecord:
    id: str
    name: str
    version: int
    body: str
    active: bool


@dataclass(frozen=True, slots=True)
class PromptView:
    id: str
    name: str
    version: int
    body: str
    active: bool


# --- providers ---------------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class ProviderRecord:
    name: str
    kind: str
    capabilities: tuple[str, ...]
    healthy: bool
    api_key_ref: str | None = None  # secret reference — never exposed


@dataclass(frozen=True, slots=True)
class ProviderView:
    name: str
    kind: str
    capabilities: tuple[str, ...]
    healthy: bool


# --- configuration (§R10.8) --------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class ConfigRecord:
    key: str
    value: str
    scope: str
    secret: bool = False


@dataclass(frozen=True, slots=True)
class ConfigView:
    key: str
    value: str  # masked when the record is marked secret
    scope: str


@dataclass(frozen=True, slots=True)
class ConfigVersionView:
    version: int
    author: str | None
    description: str | None
    created_at: datetime.datetime


# --- jobs (§R4.11) -----------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class JobRecord:
    id: str
    kind: str
    status: str
    attempts: int
    error: str | None = None


@dataclass(frozen=True, slots=True)
class JobView:
    id: str
    kind: str
    status: str
    attempts: int
    error: str | None = None


# --- health (§R12.10) --------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class ProbeView:
    name: str
    healthy: bool
    detail: str | None = None


@dataclass(frozen=True, slots=True)
class HealthView:
    healthy: bool
    probes: tuple[ProbeView, ...]


# --- analytics / metrics (§R10.3, §R11) --------------------------------------------------------


@dataclass(frozen=True, slots=True)
class MetricEntry:
    """A single analytics value with its availability (§R10.3 — gated metrics are flagged)."""

    name: str
    value: float | None
    available: bool


@dataclass(frozen=True, slots=True)
class AnalyticsView:
    entries: tuple[MetricEntry, ...]


@dataclass(frozen=True, slots=True)
class MetricsView:
    counters: tuple[tuple[str, int], ...]
    timers: tuple[tuple[str, float], ...]


# --- errors (§R12.9) ---------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class ErrorRecord:
    id: str
    module: str
    severity: str
    resolved: bool
    message: str


@dataclass(frozen=True, slots=True)
class ErrorView:
    id: str
    module: str
    severity: str
    resolved: bool
    message: str
