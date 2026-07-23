"""Pure-logic tests: backoff, status machine, retry classification, pipeline (offline)."""

from __future__ import annotations

import pytest

from app.models.enums import TaskStatus, TaskType
from app.workers import backoff, pipeline, retry, status
from app.workers.errors import NeedsReviewError, PermanentError, TransientError


# --- backoff ---
def test_backoff_grows_then_caps() -> None:
    no_jitter = 0.5  # rand=0.5 -> zero jitter
    assert backoff.compute_delay(0, rand=lambda: no_jitter) == backoff.BASE_DELAY
    assert (
        backoff.compute_delay(1, rand=lambda: no_jitter) == backoff.BASE_DELAY * backoff.MULTIPLIER
    )
    assert backoff.compute_delay(100, rand=lambda: no_jitter) == backoff.MAX_DELAY


def test_backoff_jitter_within_bounds() -> None:
    low = backoff.compute_delay(1, rand=lambda: 0.0)
    high = backoff.compute_delay(1, rand=lambda: 1.0)
    mid = backoff.BASE_DELAY * backoff.MULTIPLIER
    assert mid * (1 - backoff.JITTER_RATIO) <= low <= mid
    assert mid <= high <= mid * (1 + backoff.JITTER_RATIO)


def test_backoff_negative_attempt_rejected() -> None:
    with pytest.raises(ValueError):
        backoff.compute_delay(-1)


# --- status machine ---
def test_status_transitions() -> None:
    assert status.can_transition(TaskStatus.pending, TaskStatus.running)
    assert status.can_transition(TaskStatus.running, TaskStatus.succeeded)
    assert status.can_transition(TaskStatus.failed, TaskStatus.dead)
    assert not status.can_transition(TaskStatus.succeeded, TaskStatus.running)
    with pytest.raises(ValueError):
        status.assert_transition(TaskStatus.succeeded, TaskStatus.running)


# --- retry ---
def test_retry_classify() -> None:
    assert retry.classify(TransientError()) is retry.ErrorClass.transient
    assert retry.classify(PermanentError()) is retry.ErrorClass.permanent
    assert retry.classify(NeedsReviewError()) is retry.ErrorClass.permanent
    assert retry.classify(RuntimeError()) is retry.ErrorClass.transient  # unknown -> transient


def test_retry_decide() -> None:
    assert retry.decide(0, retry.ErrorClass.transient, max_retries=5) is retry.RetryOutcome.retry
    assert retry.decide(4, retry.ErrorClass.transient, max_retries=5) is retry.RetryOutcome.dead
    assert (
        retry.decide(0, retry.ErrorClass.permanent, max_retries=5)
        is retry.RetryOutcome.needs_review
    )


# --- pipeline chaining (declarative data) ---
def test_pipeline_chain() -> None:
    assert pipeline.next_stage(TaskType.generate_text) is TaskType.validate
    assert pipeline.next_stage(TaskType.validate) is TaskType.generate_image
    assert pipeline.next_stage(TaskType.publish) is TaskType.collect_metrics
    assert pipeline.next_stage(TaskType.collect_metrics) is None
    assert pipeline.next_stage(TaskType.backup) is None
