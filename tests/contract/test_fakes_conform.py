"""Contract tests (owner req 22, §R2.10): subsystem fakes conform to their public Protocols.

Uses structural conformance only (``ProtocolConformance``) — never internal implementations.
"""

from __future__ import annotations

import pytest

from app.admin.authentication import PasswordHasher
from app.admin.fakes import FakePasswordHasher, FakeSessionStore
from app.admin.sessions import SessionStore
from app.analytics.events import EventExporter, EventSink
from app.analytics.fakes import FakeEventExporter, FakeEventSink, FakeMetricSink
from app.analytics.metrics import MetricSink
from app.telegram.base import TelegramProvider
from app.telegram.fakes import FakeTelegramProvider
from tests.framework.contract import ProtocolConformance

_CONFORMANCE = ProtocolConformance()

_PAIRS: list[tuple[object, type]] = [
    (FakeEventExporter(), EventExporter),
    (FakeEventSink(), EventSink),
    (FakeMetricSink(), MetricSink),
    (FakePasswordHasher(), PasswordHasher),
    (FakeSessionStore(), SessionStore),
    (FakeTelegramProvider(), TelegramProvider),
]


@pytest.mark.contract
@pytest.mark.parametrize("fake, protocol", _PAIRS)
def test_fake_conforms_to_public_protocol(fake: object, protocol: type) -> None:
    missing = _CONFORMANCE.missing_members(fake, protocol)
    assert not missing, f"{type(fake).__name__} missing {missing} for {protocol.__name__}"


def test_conformance_detects_missing_members() -> None:
    class _Empty:
        pass

    assert _CONFORMANCE.missing_members(_Empty(), EventSink)
    assert not _CONFORMANCE.conforms(_Empty(), EventSink)


def test_conformance_rejects_non_protocol() -> None:
    with pytest.raises(TypeError):
        _CONFORMANCE.missing_members(object(), int)
