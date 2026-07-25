"""AI Engine composition root (§R5, §R2.10). Wires the engine with the Stage-11 provider factory and
offline-safe defaults (empty context sources, no-op cost/stream sinks, permissive validation). Real
Memory/RAG sources (Stage 13) and quality gates (Stage 14) are injected here without changing the
engine. This is the one place that assembles concrete collaborators.
"""

from __future__ import annotations

from collections.abc import Sequence

from app.content.budget import HeuristicTokenEstimator
from app.content.context import ContextBuilder
from app.content.cost import CostSink
from app.content.engine import AIEngine
from app.content.fakes import EmptyKnowledgeSource, EmptyMemorySource
from app.content.pipeline import PromptBuilder
from app.content.rewrite import RewritePolicy
from app.content.selection import ModelRouter, ProviderSelector
from app.content.sources import KnowledgeContextSource, MemoryContextSource
from app.content.streaming import StreamSink
from app.content.validation import OutputValidator
from app.core.config import Settings
from app.core.providers.factory import ProviderFactory
from app.services.providers import build_provider_factory


def build_ai_engine(
    settings: Settings,
    *,
    provider_factory: ProviderFactory | None = None,
    memory: MemoryContextSource | None = None,
    knowledge: KnowledgeContextSource | None = None,
    validators: Sequence[OutputValidator] = (),
    cost_sink: CostSink | None = None,
    stream_sink: StreamSink | None = None,
) -> AIEngine:
    """Assemble an :class:`AIEngine`. Defaults are fully offline (fakes + no-op seams)."""
    factory = provider_factory if provider_factory is not None else build_provider_factory(settings)
    estimator = HeuristicTokenEstimator()
    context_builder = ContextBuilder(
        memory if memory is not None else EmptyMemorySource(),
        knowledge if knowledge is not None else EmptyKnowledgeSource(),
        estimator,
    )
    return AIEngine(
        provider_selector=ProviderSelector(factory),
        model_router=ModelRouter(),
        prompt_builder=PromptBuilder(),
        context_builder=context_builder,
        estimator=estimator,
        rewrite_policy=RewritePolicy(),
        validators=validators,
        cost_sink=cost_sink,
        stream_sink=stream_sink,
    )
