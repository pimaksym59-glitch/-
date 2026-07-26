"""DTO mapping layer (owner req 14) — record -> view with mandatory secret masking (§R10.4).

This is the only place that turns store ``*Record`` types into UI ``*View`` types. Secret-
bearing fields (``password_hash``, ``mfa_secret_ref``, ``bot_token_ref``, ``api_key_ref``,
secret config values) are dropped or masked here and never reach a view.

"""

from __future__ import annotations

from app.admin.dto import (
    ChannelRecord,
    ChannelView,
    ConfigRecord,
    ConfigView,
    ErrorRecord,
    ErrorView,
    JobRecord,
    JobView,
    PromptRecord,
    PromptView,
    ProviderRecord,
    ProviderView,
    UserRecord,
    UserView,
)

MASK = "***"


def to_user_view(record: UserRecord) -> UserView:
    """Map a user record to a view, dropping secrets and deriving ``mfa_enabled`` (§R10.4)."""

    return UserView(
        id=record.id,
        email=record.email,
        role=record.role,
        status=record.status,
        mfa_enabled=record.mfa_secret_ref is not None,
    )


def to_channel_view(record: ChannelRecord) -> ChannelView:
    """Map a channel record to a view, dropping the bot-token reference (§R10.4)."""

    return ChannelView(
        id=record.id, title=record.title, status=record.status, language=record.language
    )


def to_provider_view(record: ProviderRecord) -> ProviderView:
    """Map a provider record to a view, dropping the api-key reference (§R10.4)."""

    return ProviderView(
        name=record.name,
        kind=record.kind,
        capabilities=record.capabilities,
        healthy=record.healthy,
    )


def to_prompt_view(record: PromptRecord) -> PromptView:
    """Map a versioned prompt record to a view (§R10.6)."""

    return PromptView(
        id=record.id,
        name=record.name,
        version=record.version,
        body=record.body,
        active=record.active,
    )


def to_config_view(record: ConfigRecord) -> ConfigView:
    """Map a config record to a view, masking the value when the record is secret (§R10.4)."""

    return ConfigView(
        key=record.key,
        value=MASK if record.secret else record.value,
        scope=record.scope,
    )


def to_job_view(record: JobRecord) -> JobView:
    """Map a job record to a view (§R4.11)."""

    return JobView(
        id=record.id,
        kind=record.kind,
        status=record.status,
        attempts=record.attempts,
        error=record.error,
    )


def to_error_view(record: ErrorRecord) -> ErrorView:
    """Map an error record to a view (§R12.9)."""

    return ErrorView(
        id=record.id,
        module=record.module,
        severity=record.severity,
        resolved=record.resolved,
        message=record.message,
    )
