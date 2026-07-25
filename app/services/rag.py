"""RAG composition root (§R9). Assembles Memory and Knowledge context sources (embedding via the
Stage-11 provider factory, §R2.10; in-memory fakes by default) and wires them into the Stage-12 AI
Engine — the engine is unchanged (it consumes the context ports). Memory and Knowledge stay
independent; they meet only here and at the engine's ports (owner req 8).
"""

from __future__ import annotations

from app.content.budget import HeuristicTokenEstimator
from app.content.engine import AIEngine
from app.core.config import Settings
from app.memory.source import MemoryRetriever
from app.memory.stores import FakeMemoryStore, MemoryStore
from app.rag.assembly import ContextAssembler
from app.rag.chunking import Chunker, SemanticBlockChunker
from app.rag.embedding import Embedder, ProviderEmbedder
from app.rag.fakes import FakeDocumentStore, FakeVectorStore
from app.rag.knowledge import KnowledgeRetriever, ingest_document
from app.rag.retrieval import RetrievalPipeline
from app.rag.stores import DocumentStore, VectorStore
from app.rag.types import Chunk, Document
from app.services.ai import build_ai_engine
from app.services.providers import get_embedding_provider


def _embedder(settings: Settings, embedder: Embedder | None) -> Embedder:
    return embedder if embedder is not None else ProviderEmbedder(get_embedding_provider(settings))


def build_knowledge_source(
    settings: Settings,
    *,
    embedder: Embedder | None = None,
    vector_store: VectorStore | None = None,
) -> KnowledgeRetriever:
    """Knowledge context source over the retrieval kernel (fake vector store by default)."""
    pipeline = RetrievalPipeline(
        vector_store if vector_store is not None else FakeVectorStore(),
        _embedder(settings, embedder),
    )
    assembler = ContextAssembler(HeuristicTokenEstimator(), kind="knowledge")
    return KnowledgeRetriever(pipeline, assembler, budget=settings.max_context_tokens)


def build_memory_source(
    settings: Settings,
    *,
    embedder: Embedder | None = None,
    memory_store: MemoryStore | None = None,
) -> MemoryRetriever:
    """Memory context source over the retrieval kernel (fake memory store by default)."""
    assembler = ContextAssembler(HeuristicTokenEstimator(), kind="example")
    return MemoryRetriever(
        memory_store if memory_store is not None else FakeMemoryStore(),
        _embedder(settings, embedder),
        assembler,
        budget=settings.max_context_tokens,
    )


def build_ai_engine_with_rag(
    settings: Settings,
    *,
    embedder: Embedder | None = None,
) -> AIEngine:
    """AI Engine wired with real Memory + Knowledge sources (Stage 12 engine unchanged)."""
    return build_ai_engine(
        settings,
        memory=build_memory_source(settings, embedder=embedder),
        knowledge=build_knowledge_source(settings, embedder=embedder),
    )


async def ingest(
    document: Document,
    *,
    settings: Settings,
    vector_store: VectorStore,
    document_store: DocumentStore | None = None,
    embedder: Embedder | None = None,
    chunker: Chunker | None = None,
) -> list[Chunk]:
    """Ingest a document into a knowledge vector store (§R9.4)."""
    return await ingest_document(
        document,
        chunker=chunker if chunker is not None else SemanticBlockChunker(),
        embedder=_embedder(settings, embedder),
        vector_store=vector_store,
        document_store=document_store if document_store is not None else FakeDocumentStore(),
    )
