"""Quality rewrite pipeline (§R5.6, owner req 10) — **separate from the retry infrastructure**. This
loop improves quality by regenerating with feedback up to ``MAX_REWRITES``; it never uses the
queue's retry engine (``MAX_RETRIES``, infra). Deterministic: feedback derives from the issues,
no randomness.
"""

from __future__ import annotations

from app.content.validation import ValidationResult


class RewritePolicy:
    def should_rewrite(
        self, attempt: int, validation: ValidationResult, *, max_rewrites: int
    ) -> bool:
        """Rewrite only on a failed validation and while quality attempts remain (§R5.6)."""
        return not validation.passed and attempt < max_rewrites

    def refine(self, base_prompt: str, validation: ValidationResult) -> str:
        """Append deterministic revision feedback derived from the validation issues."""
        if not validation.issues:
            return base_prompt
        feedback = "; ".join(validation.issues)
        return f"{base_prompt}\n\n## revision\nRevise to address: {feedback}"
