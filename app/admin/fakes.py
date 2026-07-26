"""Deterministic fakes for the Admin subsystem (owner reqs 19, 20).

Every fake is in-memory, advances only through explicit state (a monotonic clock, sequential
id/token factories), and performs no network / real crypto / real time. The fake password
hasher is a reversible non-cryptographic tag purely for tests. Nothing here reaches a real Web
UI, DB or SSO (RV-17).

"""

from __future__ import annotations

import datetime
from collections.abc import Mapping, Sequence

from app.admin.ai_studio import DryRunResult
from app.admin.audit import AuditValue
from app.admin.authentication import Account
from app.admin.dto import (
    ChannelRecord,
    ConfigRecord,
    ConfigVersionView,
    ErrorRecord,
    JobRecord,
    MetricEntry,
    ProbeView,
    PromptRecord,
    ProviderRecord,
    UserRecord,
)
from app.admin.feature_flags import FeatureFlag
from app.admin.sessions import LoginAttempt, Session

_EPOCH = datetime.datetime(2026, 1, 1, tzinfo=datetime.UTC)


class FakeClock:
    """Monotonic clock that advances by a fixed step on every :meth:`now` call."""

    def __init__(self, step_seconds: float = 1.0) -> None:
        self._current = _EPOCH
        self._step = datetime.timedelta(seconds=step_seconds)

    def now(self) -> datetime.datetime:
        value = self._current
        self._current = self._current + self._step
        return value


class FakeIdFactory:
    def __init__(self, prefix: str = "id") -> None:
        self._prefix = prefix
        self._n = 0

    def new_id(self) -> str:
        self._n += 1
        return f"{self._prefix}-{self._n}"


class FakeTokenFactory:
    def __init__(self, prefix: str = "tok") -> None:
        self._prefix = prefix
        self._n = 0

    def new_token(self) -> str:
        self._n += 1
        return f"{self._prefix}-{self._n}"


class FakePasswordHasher:
    """Reversible non-cryptographic tag hasher for tests (satisfies HashingPasswordHasher)."""

    def hash(self, secret: str) -> str:
        return f"h:{secret}"

    def verify(self, secret: str, password_hash: str) -> bool:
        return password_hash == f"h:{secret}"


class FakeMfaVerifier:
    """Accepts a fixed deterministic OTP."""

    def verify(self, secret_ref: str, otp: str) -> bool:
        return otp == "123456"


class FakeAccountLookup:
    def __init__(self, accounts: Mapping[str, Account] | None = None) -> None:
        self._accounts = dict(accounts or {})

    def add(self, email: str, account: Account) -> None:
        self._accounts[email] = account

    def find(self, email: str) -> Account | None:
        return self._accounts.get(email)


class FakeSessionStore:
    def __init__(self) -> None:
        self._by_token: dict[str, Session] = {}

    def save(self, session: Session) -> None:
        self._by_token[session.token] = session

    def get(self, token: str) -> Session | None:
        return self._by_token.get(token)

    def delete(self, token: str) -> None:
        self._by_token.pop(token, None)

    def delete_for_user(self, user_id: str) -> int:
        victims = [t for t, s in self._by_token.items() if s.user_id == user_id]
        for token in victims:
            del self._by_token[token]
        return len(victims)


class FakeLoginJournal:
    def __init__(self) -> None:
        self.attempts: list[LoginAttempt] = []

    def record(self, attempt: LoginAttempt) -> None:
        self.attempts.append(attempt)


class FakeAuditPort:
    def __init__(self) -> None:
        self.records: list[tuple[str, str, str | None]] = []

    def record(
        self,
        actor: str,
        action: str,
        entity: str | None,
        entity_id: str | None,
        before: Mapping[str, AuditValue],
        after: Mapping[str, AuditValue],
    ) -> None:
        self.records.append((actor, action, entity))


class FakeAnalyticsRead:
    def __init__(self, entries: Sequence[MetricEntry] | None = None) -> None:
        self._entries = tuple(entries or ())

    def entries(self) -> Sequence[MetricEntry]:
        return self._entries


class FakeMetricsRead:
    def __init__(
        self,
        counters: Sequence[tuple[str, int]] | None = None,
        timers: Sequence[tuple[str, float]] | None = None,
    ) -> None:
        self._counters = tuple(counters or ())
        self._timers = tuple(timers or ())

    def counters(self) -> Sequence[tuple[str, int]]:
        return self._counters

    def timers(self) -> Sequence[tuple[str, float]]:
        return self._timers


class FakeJobMonitor:
    def __init__(self, jobs: Sequence[JobRecord] | None = None) -> None:
        self._jobs = tuple(jobs or ())

    def list_jobs(self) -> Sequence[JobRecord]:
        return self._jobs


class FakeQueue:
    def __init__(self) -> None:
        self.submitted: list[object] = []

    def submit(self, intent: object) -> None:
        self.submitted.append(intent)


class FakeHealthRead:
    def __init__(self, probes: Sequence[ProbeView] | None = None) -> None:
        self._probes = tuple(probes or ())

    def probes(self) -> Sequence[ProbeView]:
        return self._probes


class FakeErrorReport:
    def __init__(self, errors: Sequence[ErrorRecord] | None = None) -> None:
        self._errors = tuple(errors or ())

    def list_errors(self) -> Sequence[ErrorRecord]:
        return self._errors


class FakeFeatureFlagStore:
    def __init__(self, flags: Sequence[FeatureFlag] | None = None) -> None:
        self._by_name: dict[str, FeatureFlag] = {f.name: f for f in (flags or ())}

    def list_flags(self) -> Sequence[FeatureFlag]:
        return tuple(self._by_name.values())

    def get(self, name: str) -> FeatureFlag | None:
        return self._by_name.get(name)

    def set(self, flag: FeatureFlag) -> None:
        self._by_name[flag.name] = flag


class FakeUserStore:
    def __init__(self, users: Sequence[UserRecord] | None = None) -> None:
        self._by_id: dict[str, UserRecord] = {u.id: u for u in (users or ())}

    def list_users(self) -> Sequence[UserRecord]:
        return tuple(self._by_id.values())

    def get(self, user_id: str) -> UserRecord | None:
        return self._by_id.get(user_id)

    def upsert(self, record: UserRecord) -> None:
        self._by_id[record.id] = record


class FakeChannelStore:
    def __init__(self, channels: Sequence[ChannelRecord] | None = None) -> None:
        self._by_id: dict[str, ChannelRecord] = {c.id: c for c in (channels or ())}

    def list_channels(self) -> Sequence[ChannelRecord]:
        return tuple(self._by_id.values())

    def get(self, channel_id: str) -> ChannelRecord | None:
        return self._by_id.get(channel_id)

    def upsert(self, record: ChannelRecord) -> None:
        self._by_id[record.id] = record


class FakePromptStore:
    def __init__(self) -> None:
        self._by_name: dict[str, list[PromptRecord]] = {}

    def versions(self, name: str) -> Sequence[PromptRecord]:
        return tuple(self._by_name.get(name, ()))

    def add_version(self, record: PromptRecord) -> None:
        existing = [self._deactivate(r) for r in self._by_name.get(record.name, [])]
        existing.append(record)
        self._by_name[record.name] = existing

    @staticmethod
    def _deactivate(record: PromptRecord) -> PromptRecord:
        if not record.active:
            return record
        return PromptRecord(
            id=record.id,
            name=record.name,
            version=record.version,
            body=record.body,
            active=False,
        )


class FakeProviderRegistry:
    def __init__(self, providers: Sequence[ProviderRecord] | None = None) -> None:
        self._providers = tuple(providers or ())

    def list_providers(self) -> Sequence[ProviderRecord]:
        return self._providers


class FakeConfigStore:
    def __init__(self) -> None:
        self._by_key: dict[str, ConfigRecord] = {}
        self._versions: list[ConfigVersionView] = []

    def list_config(self) -> Sequence[ConfigRecord]:
        return tuple(self._by_key.values())

    def get(self, key: str) -> ConfigRecord | None:
        return self._by_key.get(key)

    def put(self, record: ConfigRecord) -> None:
        self._by_key[record.key] = record

    def add_version(self, version: ConfigVersionView) -> None:
        self._versions.append(version)

    def versions(self) -> Sequence[ConfigVersionView]:
        return tuple(self._versions)


class FakeDryRun:
    """Deterministic dry-run: preview echoes the prompt; cost is a fixed function of length."""

    def dry_run(self, prompt: str, model: str) -> DryRunResult:
        return DryRunResult(
            model=model,
            preview=f"[{model}] {prompt[:32]}",
            estimated_cost_usd=round(len(prompt) * 0.001, 4),
        )
