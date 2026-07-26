"""End-to-end test architecture (§R13.2) — offline orchestrator for the 5-stage pipeline.

Models the pipeline ``generate_text → validate → generate_image → publish → collect_metrics``
as an ordered chain of stages with **continuation-chaining**: the first failing stage stops
the chain (downstream is never scheduled, §R8.4). Stages are injected callables that use
public fakes/facades; a full production-wired, queue-backed run is Runtime Verification
Pending (RV-7/RV-18).

"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from enum import StrEnum

Context = dict[str, object]


class PipelineStage(StrEnum):
    """The five pipeline stages (§R13.2)."""

    GENERATE_TEXT = "generate_text"
    VALIDATE = "validate"
    GENERATE_IMAGE = "generate_image"
    PUBLISH = "publish"
    COLLECT_METRICS = "collect_metrics"


@dataclass(frozen=True, slots=True)
class StageResult:
    """Outcome of one stage."""

    stage: str
    ok: bool
    detail: str | None = None


@dataclass(frozen=True, slots=True)
class PipelineRun:
    """Result of an orchestrated run: per-stage results + whether the whole chain completed."""

    results: tuple[StageResult, ...]
    completed: bool

    def ran(self) -> tuple[str, ...]:
        return tuple(r.stage for r in self.results)


StageFn = Callable[[Context], StageResult]


class PipelineOrchestrator:
    """Runs stages in order, stopping at the first failure (continuation-chaining, §R8.4)."""

    def run(self, stages: Sequence[tuple[str, StageFn]], context: Context) -> PipelineRun:
        results: list[StageResult] = []
        for _name, fn in stages:
            result = fn(context)
            results.append(result)
            if not result.ok:
                return PipelineRun(results=tuple(results), completed=False)
        return PipelineRun(results=tuple(results), completed=True)
