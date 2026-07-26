"""E2E pipeline scenarios (§R13.2, T-E) — offline, on public fakes/facades.

Exercises the 5-stage pipeline through the framework orchestrator: happy path, fail-fast chaining,
and a LEAD_TIME deferral model. A full production-wired, queue-backed run is RV-7/RV-18.
"""

from __future__ import annotations

import asyncio
import datetime

import pytest

from app.analytics.audit import AuditEvent
from app.telegram.fakes import FakeTelegramProvider
from tests.framework.e2e import Context, PipelineOrchestrator, PipelineStage, StageFn, StageResult
from tests.framework.fixtures import build_pipeline_env

_WHEN = datetime.datetime(2026, 1, 1, tzinfo=datetime.UTC)


def _text_stage() -> StageFn:
    def _run(ctx: Context) -> StageResult:
        ctx["text"] = "generated draft"
        return StageResult(stage=PipelineStage.GENERATE_TEXT, ok=True)

    return _run


def _validate_stage(*, passes: bool) -> StageFn:
    def _run(ctx: Context) -> StageResult:
        detail = None if passes else "gate"
        return StageResult(stage=PipelineStage.VALIDATE, ok=passes, detail=detail)

    return _run


def _image_stage() -> StageFn:
    def _run(ctx: Context) -> StageResult:
        ctx["image"] = b"deterministic-bytes"
        return StageResult(stage=PipelineStage.GENERATE_IMAGE, ok=True)

    return _run


def _publish_stage(provider: FakeTelegramProvider) -> StageFn:
    def _run(ctx: Context) -> StageResult:
        text = str(ctx.get("text", ""))
        result = asyncio.run(provider.send_message(123, text))  # public fake facade
        ctx["message_id"] = result.message_id
        return StageResult(stage=PipelineStage.PUBLISH, ok=True)

    return _run


@pytest.mark.e2e
def test_e2e_happy_path() -> None:
    env = build_pipeline_env()
    audited: list[str] = []

    def _collect(ctx: Context) -> StageResult:
        env.analytics.audit(
            AuditEvent(actor="pipeline", action="collect_metrics", occurred_at=_WHEN)
        )
        audited.append("done")
        return StageResult(stage=PipelineStage.COLLECT_METRICS, ok=True)

    stages: list[tuple[str, StageFn]] = [
        (PipelineStage.GENERATE_TEXT, _text_stage()),
        (PipelineStage.VALIDATE, _validate_stage(passes=True)),
        (PipelineStage.GENERATE_IMAGE, _image_stage()),
        (PipelineStage.PUBLISH, _publish_stage(env.telegram)),
        (PipelineStage.COLLECT_METRICS, _collect),
    ]
    context: Context = {}
    run = PipelineOrchestrator().run(stages, context)
    assert run.completed
    assert len(run.ran()) == 5
    assert audited == ["done"]
    assert "message_id" in context


@pytest.mark.e2e
def test_e2e_validation_failure_stops_chain() -> None:
    env = build_pipeline_env()
    stages: list[tuple[str, StageFn]] = [
        (PipelineStage.GENERATE_TEXT, _text_stage()),
        (PipelineStage.VALIDATE, _validate_stage(passes=False)),
        (PipelineStage.GENERATE_IMAGE, _image_stage()),
        (PipelineStage.PUBLISH, _publish_stage(env.telegram)),
    ]
    run = PipelineOrchestrator().run(stages, {})
    assert not run.completed
    assert run.ran() == (PipelineStage.GENERATE_TEXT, PipelineStage.VALIDATE)


@pytest.mark.e2e
def test_e2e_lead_time_deferral_model() -> None:
    # T-E-03 model: generation overran the lead-time window -> defer (stage not-ok, chain stops).
    def _text_overrun() -> StageFn:
        def _run(ctx: Context) -> StageResult:
            generation_seconds = 900
            lead_time_seconds = 600
            ok = generation_seconds <= lead_time_seconds
            return StageResult(stage=PipelineStage.GENERATE_TEXT, ok=ok, detail="deferred")

        return _run

    run = PipelineOrchestrator().run([(PipelineStage.GENERATE_TEXT, _text_overrun())], {})
    assert not run.completed
    assert run.results[0].detail == "deferred"
