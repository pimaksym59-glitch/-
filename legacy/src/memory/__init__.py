"""Memory / RAG — embeddings, knowledge base, retrieval over pgvector.

Layout:
- embeddings.py  Embedder protocol + OpenAIEmbedder / FakeEmbedder
- chunking.py    pure text chunking for ingestion
- ingest.py      (re)chunk + embed a KnowledgeDocument into knowledge_chunks
- retrieval.py   cosine-similarity search; per-channel context assembly

Retrieval is wired into ai_engine's generate stage (context injected into the
prompt). Depends on: db (Stage 2), ai_engine (Stage 4).
"""
