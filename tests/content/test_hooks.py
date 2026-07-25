"""Hook seam tests (owner req 12/13): streaming + cost hooks are no-op by default."""

from __future__ import annotations

from app.content.cost import NoOpCostSink, RecordingCostSink
from app.content.streaming import NoOpStreamSink
from app.content.types import Usage


async def test_noop_stream_sink_does_nothing() -> None:
    sink = NoOpStreamSink()
    await sink.on_token("x")
    await sink.on_complete()  # must not raise


async def test_noop_cost_sink_does_nothing() -> None:
    await NoOpCostSink().record(Usage("m", 1, 1), provider="fake")  # must not raise


async def test_recording_cost_sink_captures_usage() -> None:
    sink = RecordingCostSink()
    await sink.record(Usage("m", 3, 4), provider="fake")
    assert sink.records == [(Usage("m", 3, 4), "fake")]
