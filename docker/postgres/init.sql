-- PostgreSQL init (§R4.1): enable required extensions on first container start.
-- Runs from /docker-entrypoint-initdb.d/ only when the data volume is empty.
CREATE EXTENSION IF NOT EXISTS vector;   -- pgvector: embedding columns / ANN (HNSW)
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- trigram / fuzzy + FTS support
