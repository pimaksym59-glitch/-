-- Enable pgvector for RAG embeddings (Stage 5). Runs once on first DB init.
CREATE EXTENSION IF NOT EXISTS vector;
