"""Domain: content generation (§R5). The AI Engine (:class:`app.content.engine.AIEngine`) is a
provider-agnostic orchestrator over the Stage-11 ``LLMProvider`` protocol. No DB session, no HTTP,
no business rules — persona/style come in as data and quality gates plug into the validation seam.
"""

from __future__ import annotations

from app.content.engine import AIEngine
from app.content.fallback import GenerationExhausted, generate_with_fallback
from app.content.selection import ModelRouter, ProviderSelector
from app.content.types import (
    GenerationRequest,
    GenerationResult,
    PromptPart,
    PromptSpec,
    Role,
    Usage,
)
from app.content.validation import AlwaysPass, OutputValidator, ValidationResult

__all__ = [
    "AIEngine",
    "AlwaysPass",
    "GenerationExhausted",
    "GenerationRequest",
    "GenerationResult",
    "ModelRouter",
    "OutputValidator",
    "PromptPart",
    "PromptSpec",
    "ProviderSelector",
    "Role",
    "Usage",
    "ValidationResult",
    "generate_with_fallback",
]
