"""Text chunking for RAG ingestion — pure, no I/O, unit-tested.

Splits on word boundaries into ~chunk_size-char windows with char overlap so
retrieval context doesn't cut mid-word and adjacent chunks share some context.
"""

from __future__ import annotations


def chunk_text(text: str, *, chunk_size: int = 800, overlap: int = 150) -> list[str]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must be in [0, chunk_size)")

    words = text.split()
    if not words:
        return []

    chunks: list[str] = []
    current: list[str] = []
    length = 0
    for word in words:
        added = len(word) + (1 if current else 0)
        if length + added > chunk_size and current:
            chunk = " ".join(current)
            chunks.append(chunk)
            # Start next chunk with a tail of the previous one for overlap.
            tail = chunk[-overlap:] if overlap else ""
            current = tail.split()
            length = len(" ".join(current))
            # Re-add the current word after seeding the overlap tail.
            length += len(word) + (1 if current else 0)
            current.append(word)
        else:
            current.append(word)
            length += added

    if current:
        chunks.append(" ".join(current))
    return chunks
