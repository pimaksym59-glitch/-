# RUNTIME_VERIFICATION_REGISTRY.md — Runtime Verification Pending (RV-1 … RV-18)

Consolidated from `TECHNICAL_BACKLOG.md §6`. These items are **Implemented + Statically Verified** in code
but require live services / tooling / infrastructure to be **Runtime Verified**. They are **not** defects and
**not** counted as done. They are the agenda of the Production Readiness Review.

---

| RV | Area | Requires | Stage |
|---|---|---|---|
| RV-1 | `docker build` + full-stack install (asyncpg/pgvector/aiogram/anthropic/openai/pillow) on `python:3.13-slim` | Docker | 3/4/16 |
| RV-2 | `docker compose config`, `caddy validate`, infra up, healthcheck transitions, `python -m app doctor` in container | Docker | 3 |
| RV-3 | §R12.3–R12.5 / §R4.1 runtime (pgvector/pg_trgm, least-exposure, non-root) | Docker | 3 |
| RV-4 | `alembic upgrade head` on live PostgreSQL (extensions/enums/25 tables/indexes) | PostgreSQL | 4 |
| RV-5 | Real repository CRUD + pgvector/HNSW/partial-unique/optimistic-lock | PostgreSQL | 4 |
| RV-6 | Redis runtime: SET/GET/EXPIRE/EVAL(Lua)/SUBSCRIBE, token-bucket atomicity, lock safe-release, pub/sub | Redis | 5 |
| RV-7 | Queue runtime: `FOR UPDATE SKIP LOCKED`, status persistence, enqueue/dequeue, N-worker concurrency | PostgreSQL + Redis | 8 |
| RV-8 | Scheduler runtime: advisory lock, materialization, slot idempotency, N-instance concurrency | PostgreSQL | 9 |
| RV-9 | API runtime: readiness to live PG/Redis, uvicorn serving, lifespan against real connections | PostgreSQL + Redis | 10 |
| RV-10 | Real provider adapters (OpenAI/Anthropic/aiogram) + install/import on 3.14; retry/timeout/CB under load | external APIs | 12/15/16 |
| RV-11 | AI Engine against live LLMs (routing/fallback/streaming/cost/latency) | live LLMs | 12 |
| RV-12 | RAG against live pgvector + embeddings; keyword/hybrid(RRF)/reranking | PG + embeddings | 13 |
| RV-13 | Validation live LLM-judge + vector-stage dedup | LLM + embeddings | 14 |
| RV-14 | Image against live providers + identity-conditioning + CLIP/face validation | image APIs | 15 |
| RV-15 | Telegram against live Bot API/webhook/polling + distributed rate-limit + at-least-once | Bot API | 16 |
| RV-16 | Analytics telemetry export (OTel/Prometheus) / persistence / engagement / external backends | telemetry/DB backends | 17 |
| RV-17 | Admin Web UI (HTMX/HTTP) / browser / cookie session / CSRF over wire / hasher/MFA/SSO / persistence / queue actions | Web UI/DB/SSO | 18 |
| RV-18 | Test Infra runtime: real performance/stress/chaos/mutation/Hypothesis/pytest-xdist/CI-CD/coverage-enforcement/real-integration | tools/CI/services | 19 |

## Inheritance

RV-11…RV-17 inherit RV-10 (real vendor adapters). RV-16/RV-17 inherit RV-9 (DB persistence). RV-17 inherits
RV-7 (queue actions). RV-18 inherits RV-4…RV-17 (real integration). Closing the infra RVs (RV-1…RV-9) unlocks
most of the rest.

## Note

No RV item blocks any implemented stage; the entire system runs and is tested **offline** through the
provider/port fakes. See `PRODUCTION_READINESS_SUMMARY.md` for the review agenda.
