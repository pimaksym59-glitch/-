"""Prompt construction for the text-generation pipeline.

Kept separate from pipeline logic so prompts are easy to review and tune (the
Master Spec treats prompts as first-class). Pure string builders — no I/O.
"""

from __future__ import annotations

DEFAULT_SYSTEM = (
    "You are an expert Telegram channel author. Write engaging, accurate posts "
    "tailored to the channel's audience."
)


def build_system(*, persona_system: str | None, tone: str | None, language: str) -> str:
    parts = [persona_system.strip() if persona_system else DEFAULT_SYSTEM]
    if tone:
        parts.append(f"Tone: {tone}.")
    parts.append(f"Write in this language: {language}.")
    return "\n".join(parts)


def generate_prompt(*, channel_title: str, topic: str | None, context: str | None = None) -> str:
    subject = topic or f"a fresh, relevant post for the channel “{channel_title}”"
    parts = [f"Write a single Telegram post about {subject}."]
    if context:
        parts.append(
            "Use the following background knowledge where relevant; do not copy it "
            f"verbatim:\n---\n{context}\n---"
        )
    parts.append(
        "Keep it self-contained and ready to publish. Do not add hashtags unless "
        "they add value. Return only the post text."
    )
    return "\n".join(parts)


def self_review_prompt(*, draft: str) -> str:
    return (
        "Review and improve the following Telegram post. Fix inaccuracies, tighten "
        "the writing, and improve clarity and engagement while preserving intent. "
        "Return only the improved post text.\n\n"
        f"---\n{draft}\n---"
    )


def humanize_prompt(*, draft: str) -> str:
    return (
        "Rewrite the following post so it reads naturally and human, removing "
        "robotic phrasing and obvious AI tells, without changing the meaning. "
        "Return only the final post text.\n\n"
        f"---\n{draft}\n---"
    )
