"""Domain: RAG — storage-agnostic retrieval kernel + Knowledge Base (§R9). The kernel (types,
similarity, embedding, chunking, stores, filters, retrieval, ranking, assembly, cache,
observability,
fakes) is neutral and reused by both Memory and Knowledge; Knowledge (:mod:`app.rag.knowledge`) is
imported explicitly by its consumers so the Memory subsystem never loads it transitively.
"""

from __future__ import annotations

from app.rag.assembly import ContextAssembler
from app.rag.chunking import Chunker, SemanticBlockChunker
from app.rag.embedding import Embedder, ProviderEmbedder
from app.rag.ranking import Ranker, ScoreRanker
from app.rag.retrieval import RetrievalPipeline, RetrievalStrategy, SemanticStrategy
from app.rag.similarity import CosineSimilarity, Similarity
from app.rag.stores import ChunkStore, DocumentStore, VectorStore
from app.rag.types import (
    Chunk,
    Document,
    Metadata,
    RetrievalContext,
    RetrievalQuery,
    SearchFilter,
    SearchResult,
)

__all__ = [
    "Chunk",
    "ChunkStore",
    "Chunker",
    "ContextAssembler",
    "CosineSimilarity",
    "Document",
    "DocumentStore",
    "Embedder",
    "Metadata",
    "ProviderEmbedder",
    "Ranker",
    "RetrievalContext",
    "RetrievalPipeline",
    "RetrievalQuery",
    "RetrievalStrategy",
    "ScoreRanker",
    "SearchFilter",
    "SearchResult",
    "SemanticBlockChunker",
    "SemanticStrategy",
    "Similarity",
    "VectorStore",
]
