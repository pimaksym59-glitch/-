# ARCHITECTURE_MAP.md — Final Architecture Map (Stages 1–20)

**Project:** AI Telegram Automation Platform · **Version:** 0.1.0 · **SoT:** `MASTER_SPEC.md` v2.0 ·
**Architecture Freeze:** ACTIVE. This is a **navigational map** of all implemented subsystems and their
relationships; requirements live in `MASTER_SPEC.md`, contracts in `PUBLIC_CONTRACT_REGISTRY.md`, dependency
rules in `DEPENDENCY_MAP.md`.

---

## 1. Style

**Modular monolith** (§R3.1, not microservices): one code base, three runtime roles over a shared PostgreSQL
task queue — `api` (+ admin), `scheduler`, `worker×N` — plus Redis. Strict downward layering:

```
api → services → (domain, repositories) → models/db
```

Domain never opens a DB session or knows HTTP; repositories are SQL-only; services orchestrate; api is
routes-only. Enforced by `tests/test_layering.py` (AST guard) + per-subsystem independence tests.

## 2. Subsystem map (`app/`)

| Layer | Package(s) | Responsibility | Composition root |
|---|---|---|---|
| Core/config | `app/core/config`, `app/core/errors` | Settings (env-first, §Appendix B), neutral errors | — |
| Redis | `app/core/redis/*` | manager/keys/ttl/cache/idempotency/rate_limiter/locks/pubsub (§R2.8) | — |
| Providers | `app/core/providers/*` + `app/llm|images|telegram` base/fakes | `Provider`/`get_*_provider` + per-kind Protocols + fakes (§R2.10) | `app/services/providers.py` |
| DB/models | `app/db/*`, `app/models/*` | async engine, 25 ORM tables (§R4), enums, pgvector | — |
| Repositories | `app/repositories/*` | SQL access per aggregate | — |
| Task Queue | `app/workers/*` | registry/dispatcher/executor/retry/backoff/DLQ (§R2.2/§R8) | `app/workers/run.py` |
| Scheduler | `app/scheduler/*` | timing/DST/advisory/materializer (§R8) | `app/scheduler/run.py` |
| API | `app/api/*`, `app/schemas/*`, `app/middleware/*` | factory/lifespan/DI/errors/pagination/health (§R3.5) | `app/main.py` |
| AI Engine | `app/content/*` | orchestrator/pipeline/selection/rewrite/fallback (§R5) | `app/services/ai.py` |
| Memory/RAG | `app/rag/*`, `app/memory/*` | storage-agnostic kernel + Knowledge + Memory (§R9) | `app/services/rag.py` |
| Validation | `app/validators/*` (stdlib-only) | rules/gates/decision/dedup/humanization (§R5.5–R5.9) | `app/services/validation.py` |
| Image Engine | `app/images/*` | aspect/size/safety/postprocess/regen (§R6) | `app/services/images.py` |
| Telegram Engine | `app/telegram/*` (no aiogram) | mapping/router/registry/handlers/publishing (§R7) | `app/services/telegram.py` |
| Analytics | `app/analytics/*` (stdlib-only) | event/metrics/audit/tracing/export-seams (§R11/§R10.8/§R12.9-10) | `app/services/analytics.py` |
| Admin | `app/admin/*` (no fastapi) | authn⟂authz⟂RBAC/sessions/CSRF/management/dashboards (§R10) | `app/services/admin.py` |
| Test Infra | `tests/framework|contract|e2e` (outside `app/`) | harness/strategies/reporting/coverage (§R13, Stage 19) | — |

## 3. Domain subsystem boundaries

Each domain engine/subsystem (Stages 12–18) is **independent**: it does not import another engine; it depends
only on public **Provider Protocols** (Stage 11) and its own **ports** (Memory/RAG/Validation/state/rate-limit/
idempotency/audit/metrics/…). Real backends are injected in the composition root (`app/services/<name>.py`) or
deferred to Runtime Verification Pending. Verified by grep + independence tests
(`tests/analytics/test_independence.py`, `tests/admin/test_independence.py`, `tests/framework/test_independence.py`).

## 4. Pipeline (§R13.2)

Publication is 5 chained queue tasks (continuation-chaining, not a DAG):

```
generate_text → validate → generate_image → publish → collect_metrics
```

A failing stage stops the chain (downstream not scheduled). Modeled offline by the Stage-19 E2E orchestrator
(`tests/e2e/test_pipeline.py`).

## 5. Runtime topology (§R12.3–R12.5)

One Docker image, role = command: `api`(+admin HTMX), `scheduler`, `worker×N`; infra: PostgreSQL(pgvector),
Redis, Caddy reverse-proxy (auto-TLS). Only the proxy is exposed; DB/Redis/worker/scheduler are internal.

## 6. Cross-references

Boundaries/contracts → `PUBLIC_CONTRACT_REGISTRY.md`; dependency rules → `DEPENDENCY_MAP.md`; decisions →
`ADR_SUMMARY.md`; requirement→stage→status → `MASTER_SPEC_TRACEABILITY_FINAL.md`; unverified runtime →
`RUNTIME_VERIFICATION_REGISTRY.md`; operator docs → `docs/`.
