"""LLM client abstraction so the pipeline is provider-agnostic and testable.

`AnthropicClient` calls the Claude API; `FakeLLMClient` is a deterministic
offline stand-in used in tests and when no API key is configured. Selection is
via `get_llm_client(settings)`.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from app.config import Settings


@runtime_checkable
class LLMClient(Protocol):
    async def complete(self, *, system: str, user: str, max_tokens: int = 4096) -> str: ...


class AnthropicClient:
    """Claude API client. Uses adaptive thinking + effort and streams the
    response (per Anthropic guidance) to avoid HTTP timeouts on long output.
    """

    def __init__(self, settings: Settings) -> None:
        # Lazy import so the module (and tests using the fake) don't require the
        # `anthropic` package or a network/credentials to import.
        from anthropic import AsyncAnthropic

        self._client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self._model = settings.ai_model
        self._effort = settings.ai_effort

    async def complete(self, *, system: str, user: str, max_tokens: int = 4096) -> str:
        async with self._client.messages.stream(
            model=self._model,
            max_tokens=max_tokens,
            system=system,
            thinking={"type": "adaptive"},
            output_config={"effort": self._effort},
            messages=[{"role": "user", "content": user}],
        ) as stream:
            message = await stream.get_final_message()

        if message.stop_reason == "refusal":
            raise RuntimeError("model refused the request")
        return "".join(block.text for block in message.content if block.type == "text").strip()


class FakeLLMClient:
    """Deterministic client for tests/offline. Records calls and returns a
    stage-agnostic transformation of the input so the pipeline runs end-to-end.
    """

    def __init__(self) -> None:
        self.calls: list[tuple[str, str]] = []

    async def complete(self, *, system: str, user: str, max_tokens: int = 4096) -> str:
        self.calls.append((system, user))
        # Echo a compact, non-empty transformation of the prompt.
        snippet = " ".join(user.split())[:80]
        return f"[fake] {snippet}"


def get_llm_client(settings: Settings) -> LLMClient:
    """Real client when an API key is present, otherwise the deterministic fake."""
    if settings.anthropic_api_key:
        return AnthropicClient(settings)
    return FakeLLMClient()
