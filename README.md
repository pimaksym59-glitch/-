# AI Telegram Automation Platform

Production-ready platform that autonomously runs any number of Telegram channels: it generates
content and images, publishes on schedule, analyzes results, and preserves each channel's style —
with a central control panel and controlled self-improvement.

> **Status: under construction (greenfield rebuild).** Implemented strictly stage-by-stage per
> `MASTER_SPEC.md` §R13.1. **Stage 1 complete: repository structure.** No runnable service yet —
> entrypoints are added in their stages (queue/scheduler/API in later stages).

## Source of truth

Requirements live in **`MASTER_SPEC.md` v2.0** (the single authoritative document, §R0.2). Document
hierarchy — higher wins on conflict:

1. `MASTER_SPEC.md` — all normative requirements (`R<section>.<n>` IDs).
2. `DATABASE_SPEC.md` · `API_SPEC.md` · `TEST_PLAN.md` — realization & verification.
3. `docs/adr/` — architecture decisions (changes require a new ADR — **Architecture Freeze**).
4. `docs/spec/01–13` — historical drafts (superseded; kept for rationale).

Audits: `REPORT.md`, `DOCUMENT_AUDIT_V2.md`. Readiness: `READY_FOR_IMPLEMENTATION.md`.
Open decisions: `docs/adr/ADR-001` (MTProto stats), `ADR-002` (deploy env). Experiment plan:
`POC_IDENTITY.md`. The previous build is archived under `legacy/`.

## Architecture (summary — see §2)

Modular monolith: one codebase run as several processes (`api` / `scheduler` / `worker`) over a
shared Postgres task queue. Strict layering (§R3.1):

```
api  ->  services  ->  (domain, repositories)  ->  models / db
```

Dependencies flow downward only; cycles are forbidden. External providers (LLM / image / embedding /
Telegram) sit behind interfaces with fakes, so the whole system runs and tests **offline**.

## Repository layout (`app/`)

| Package | Layer | Responsibility |
|---|---|---|
| `api/` | presentation | routes only (no logic, no SQL) |
| `services/` | application | orchestrate one use-case |
| `content, images, llm, telegram, memory, rag, validators, analytics, notifications` | domain | pure logic + provider adapters (no DB session, no HTTP) |
| `repositories/` | data | DB queries only |
| `models/` | — | ORM models (single home) |
| `db, core, schemas, middleware, utils` | infra/shared | session, config/logging/security, DTOs, helpers |
| `scheduler/` | — | task producer |
| `workers/` | — | task handlers |

`config/` (seed + app config), `docker/`, `scripts/`, `storage/`, `logs/`, `tests/` mirror the app.

## Development

Python **3.13+**. Tooling: `ruff` (format+lint), `mypy` (strict), `pytest`.

```bash
python -m pip install -e . --group dev   # runtime deps + PEP 735 dev group
ruff format --check . && ruff check .
mypy
pytest                      # unit; integration paths need RUN_INTEGRATION=1
```

## Configuration (§R3.4, §R12.2)

Single typed loader `app/core/config.py` (Pydantic Settings). Source precedence, highest wins:

```
CLI (reserved)  >  environment variables  >  .env  >  config/*.yaml  >  code defaults
```

- **Secrets** (API keys, DB/redis URLs, bot token) load **only** from env / `.env` — never from
  `config/*.yaml` (the YAML source strips secret fields). Copy `.env.example` → `.env` (gitignored).
- **Business config** (non-secret platform defaults, §Appendix B) lives in `config/global.yaml`
  plus a per-env override `config/{development,production}.yaml` (selected by `APP_ENV`).
- Invalid config **fails fast** (`ValidationError`) at startup: ranges, URLs, enums, dirs.
- Config snapshot for logs: `Settings.to_safe_dict()` masks secrets.

Check configuration (no network connections):

```bash
python -m app doctor
```

## Docker (§R12.3–R12.5)

One image for all roles (`api` / `scheduler` / `worker`), non-root, multi-stage. Base
`python:3.13-slim`. Infra: `pgvector/pgvector:pg16`, `redis:7-alpine`, `caddy:2-alpine`.
Only Caddy publishes ports; postgres/redis/app stay on the internal network. Secrets are passed
only via environment — never baked into the image. **Requires Docker Engine.**

```bash
# 1) set POSTGRES_PASSWORD (and any keys) in .env  (cp .env.example .env)
# 2) start infrastructure only (app roles land in later stages):
docker compose up -d postgres redis caddy
# 3) build the app image and smoke-test the config loader in a container:
docker build -f docker/Dockerfile -t telegram-ai-platform:latest .
docker compose run --rm --build api python -m app doctor
```

App roles (`api`/`scheduler`/`worker`) are defined under the `app` compose profile and activate at
their stages (worker=8, scheduler=9, api=10): `docker compose --profile app up -d`.

## Database (§R4)

SQLAlchemy 2.x async ORM (`app/models`, single `Base.metadata`), PostgreSQL 16 + pgvector,
UUIDv7 primary keys (`uuid6`), soft delete + optimistic `version`. Async engine/session in
`app/db`; data-access repositories in `app/repositories` (no business logic; the caller owns the
transaction). Migrations via Alembic (`alembic.ini`, `app/db/migrations`).

```bash
# requires a live PostgreSQL (DATABASE_URL set); e.g. via `docker compose up -d postgres`
alembic upgrade head              # apply schema (extensions, enums, 25 tables, indexes)
RUN_INTEGRATION=1 pytest          # run DB round-trip integration tests
```

> Applying migrations / running queries needs a database — those paths are **Runtime Verification
> Pending** in environments without PostgreSQL. Offline unit tests cover models, metadata and
> repository wiring.

## Redis (§R2.8/§R7.6/§R8.9/§R2-CACHE)

Async infrastructure in `app/core/redis` (no business logic): lazy `RedisManager` (connection pool,
graceful shutdown), centralized `KeyBuilder` (`tai:{env}:{namespace}:{parts}` — the only place keys
are built), all TTLs in `ttl.py`, and primitives — `Cache` (get/set/delete/exists/invalidate),
`IdempotencyStore` (fast-path; source of truth stays Postgres `tasks.dedup_key`), `RateLimiter`
(distributed token-bucket via atomic Lua), `DistributedLock` (SET NX + Lua safe-release; **not** the
Postgres advisory lock), and `Publisher`/`Subscriber`.

```bash
# requires a live Redis (REDIS_URL set); e.g. via `docker compose up -d redis`
RUN_INTEGRATION=1 pytest          # run Redis integration tests
```

> Redis command execution (SET/GET, Lua, locks, rate limiter, pub/sub) needs a live Redis — those
> paths are **Runtime Verification Pending** without one. Offline tests cover keys, TTLs and wiring.

## Task Queue (§R2.2/§R8)

Custom async queue engine in `app/workers` (no Celery/RQ). Postgres `tasks` is the backbone;
`Dispatcher` claims due tasks with `FOR UPDATE SKIP LOCKED`; the `Executor` is the single place for
execution, exception handling, status changes and retry; the `TaskRegistry` maps each `TaskType` to
a typed handler; continuation-chaining is declarative data (`pipeline.py`, no if/else); retry uses
pure exponential backoff + jitter; DLQ is the `dead` status; the `Worker` loop supports graceful
shutdown + drain. Metrics/logging/hooks are infra extension points.

```bash
# requires a live PostgreSQL + Redis (DATABASE_URL, REDIS_URL)
python -m app.workers.run          # start a worker (scale by running several)
RUN_INTEGRATION=1 pytest           # run queue integration tests
```

> Claiming (SKIP LOCKED), status persistence, enqueue/dequeue, idempotency and multi-worker
> competition need live PostgreSQL/Redis — **Runtime Verification Pending** without them. Offline
> tests cover all pure logic and the full Executor decision flow (100%) on fakes.

## Scheduler (§R8.1/§R8.5–R8.7/§R8.10/§R8.13)

The scheduler in `app/scheduler` is the queue **producer** (no business logic): it scans enabled
`schedules`, computes due slots in each channel's IANA timezone, and materializes them into `tasks`
**only through the Stage-8 `TaskProducer`**. Time math is pure and DST-aware (`timing.py`):
nonexistent local times shift forward, ambiguous times take the first occurrence; cron and
`day_of_week`+`time_local` forms are both supported. `missed.py` recovers recently-missed slots
within a grace window; `holidays.py` tags a content-plan hint (content itself is chosen by the AI
stage). LEAD_TIME (§R8.5): a pipeline head starts at `slot − lead`, with the exact publish time in
`payload.target_slot`. Multi-instance safety comes from a Postgres advisory lock plus the unique
`dedup_key`; the scheduler pre-filters already-materialized slots so a re-scan enqueues nothing.

```bash
# requires a live PostgreSQL (DATABASE_URL)
python -m app.scheduler.run         # start the scheduler (safe to run several; advisory-locked)
RUN_INTEGRATION=1 pytest            # run scheduler integration tests
```

> Advisory lock, reading `schedules`, real materialization and idempotency need a live PostgreSQL —
> **Runtime Verification Pending** without it. Offline tests cover all time math (slot/DST/missed/
> holiday) and scanner/materializer/engine/runner logic on fakes.

## Implementation order (`MASTER_SPEC.md` §R13.1)

1. **Repository structure ✅** → 2. **Configuration ✅** → 3. **Docker ✅** → 4. **PostgreSQL(+pgvector) ✅** →
5. **Redis ✅** → 6. **ORM models ✅** → 7. **Repositories ✅** → 8. **Task queue + registry ✅** → 9. **Scheduler ✅** → 10. API →
11. Provider abstractions + fakes → 12. AI Engine → 13. Memory/RAG → 14. Validation →
15. Image Engine → 16. Telegram Engine → 17. Analytics → 18. Admin Panel → 19. Tests → 20. Docs.

Each stage: implement → self-review → tests/types/lint → report → **stop for confirmation**.
