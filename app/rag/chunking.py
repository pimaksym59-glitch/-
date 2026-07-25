"""Chunking — a fully independent module (owner req 4/5, §R9.5). It splits text into semantic blocks
(paragraphs, then sentences when a block is too big) and merges them up to a target token size —
**by
meaning, not by characters**. It knows nothing about retrieval or ranking. Deterministic; embeddings
are attached later during ingestion.
"""

from __future__ import annotations

import re
import uuid
from typing import Protocol

from app.content.budget import HeuristicTokenEstimator, TokenEstimator
from app.rag.types import Chunk, Metadata

_DEFAULT_TARGET_TOKENS = 256
_PARAGRAPH_SPLIT = re.compile(r"\n\s*\n")
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")


class Chunker(Protocol):
    def chunk(self, document_id: uuid.UUID, text: str, metadata: Metadata) -> list[Chunk]: ...


class SemanticBlockChunker:
    """Merges paragraphs/sentences into chunks near ``target_tokens`` (§R9.5). Deterministic."""

    def __init__(
        self,
        *,
        target_tokens: int = _DEFAULT_TARGET_TOKENS,
        estimator: TokenEstimator | None = None,
    ) -> None:
        self._target = target_tokens
        self._estimator = estimator if estimator is not None else HeuristicTokenEstimator()

    def chunk(self, document_id: uuid.UUID, text: str, metadata: Metadata) -> list[Chunk]:
        blocks = self._blocks(text)
        merged = self._merge(blocks)
        return [
            Chunk(
                id=uuid.uuid5(uuid.NAMESPACE_OID, f"{document_id}:{ordinal}"),
                document_id=document_id,
                ordinal=ordinal,
                text=body,
                metadata=metadata,
            )
            for ordinal, body in enumerate(merged)
        ]

    def _blocks(self, text: str) -> list[str]:
        blocks: list[str] = []
        for paragraph in _PARAGRAPH_SPLIT.split(text.strip()):
            block = paragraph.strip()
            if not block:
                continue
            if self._estimator.estimate(block) <= self._target:
                blocks.append(block)
            else:
                blocks.extend(s.strip() for s in _SENTENCE_SPLIT.split(block) if s.strip())
        return blocks

    def _merge(self, blocks: list[str]) -> list[str]:
        merged: list[str] = []
        current = ""
        for block in blocks:
            candidate = f"{current}\n\n{block}" if current else block
            if current and self._estimator.estimate(candidate) > self._target:
                merged.append(current)
                current = block
            else:
                current = candidate
        if current:
            merged.append(current)
        return merged
