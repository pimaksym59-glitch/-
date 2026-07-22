# AI Telegram Automation Platform

Production-ready platform for automating Telegram channels: AI text/image
generation, scheduling, long-term memory (RAG), publishing, analytics and a
central admin panel. Requirements live in `MASTER_SPEC.md` (single source of
truth).

> **Status:** All 11 stages complete — the platform runs end-to-end (channel →
> persona → knowledge → schedule → autonomous generation, publishing & analytics),
> with CI, a RAG vector index, a non-root image, backups, and healthchecks.

## Stack

Python 3.12 (async) · FastAPI · SQLAlchemy 2.0 + Alembic · PostgreSQL + pgvector
· Redis · aiogram · Docker Compose.

## Getting started

```bash
cp .env.example .env          # then edit POSTGRES_PASSWORD etc.
docker compose up --build     # starts app + postgres(pgvector) + redis
```

Verify:

```bash
curl http://localhost:8000/health      # {"status":"ok"}
curl http://localhost:8000/readiness   # postgres + redis reachability
```

## Local development (without Docker)

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --app-dir src
```

## Common commands

| Task | Command |
|------|---------|
| Run all tests | `pytest` |
| Run one test | `pytest tests/test_health.py::test_health_ok` |
| Integration tests | `RUN_INTEGRATION=1 pytest` (needs Postgres+Redis up) |
| Lint | `ruff check .` |
| Format | `ruff format .` |
| Build & run stack | `docker compose up --build` |
| Run worker + scheduler | `python -m scheduler.run` (with `--app-dir src`/PYTHONPATH) |
| Apply migrations | `alembic upgrade head` |
| New migration (autogen) | `alembic revision --autogenerate -m "msg"` |
| Rollback one migration | `alembic downgrade -1` |

## Repository layout

```
src/
  app/              # entrypoint, config, logging, db + redis clients, health
  scheduler/        # task orchestration, queue, retries        (Stage 3)
  ai_engine/        # text pipeline: generate/review/validate    (Stage 4)
  memory/           # embeddings + RAG over pgvector             (Stage 5)
  image_engine/     # image generation + diversity/similarity    (Stage 6)
  telegram_engine/  # publish queue, formatting, publishing      (Stage 7)
  validation/       # unified pre-publication checks             (Stage 8)
  analytics/        # metrics, reports, self-learning            (Stage 9)
  admin/            # management API/UI                          (Stage 10)
  app/models/       # central ORM data layer (Base.metadata)
tests/
migrations/         # Alembic env + versioned migrations
docker/postgres/    # pgvector init
```

## Data model (Stage 2)

Central schema in `src/app/models/`, one migration in `migrations/versions/`:

- **Persona / Channel** — a channel has a persona, a status, JSON settings, and
  is linked to knowledge bases (many-to-many).
- **KnowledgeBase → KnowledgeDocument → KnowledgeChunk** — RAG corpus; chunks
  carry a `Vector(1536)` embedding (dimension provisional until Stage 5).
- **Post** — content unit with a `PostStatus` lifecycle
  (draft→generating→validated→queued→published/failed/rejected).
- **Schedule** — cron/interval publishing config per channel.
- **Task** — queue unit with type, status, retries, `depends_on` self-reference.
- **PostMetric** — post-publication metric snapshots.

## Scheduler & Queue (Stage 3)

`src/scheduler/` runs as a separate process (`worker` service in compose):

- **Queue** — `tasks` table is the source of truth; workers claim the
  highest-priority runnable task with `FOR UPDATE SKIP LOCKED` (multi-worker
  safe). Runnable = due `available_at`, and dependency (`depends_on`) succeeded.
- **Retries** — a failing task is rescheduled with exponential backoff until
  `max_attempts`, then marked `failed`; dependents of a broken task are cancelled.
- **Scheduler** — active `Schedule` rows (cron or interval, per timezone) enqueue
  the pipeline-entry task and advance `next_run_at`; a Redis lock prevents
  double-enqueue across instances.
- **Handlers** — engines register per `TaskType` via `scheduler.registry`; Stage 3
  ships stubs (`stub_handlers.py`) replaced by real engines in Stages 4–9.

Pure logic (backoff, cron/interval timing, runnability) is unit-tested; the
DB/Redis paths are covered by integration tests (`RUN_INTEGRATION=1`).

## AI Engine (Stage 4)

`src/ai_engine/` turns a `generate_text` task into a `Post`:

- **Provider-agnostic** — `LLMClient` protocol with `AnthropicClient` (Claude
  `claude-opus-4-8`, adaptive thinking, effort, streaming) and a deterministic
  `FakeLLMClient`. `get_llm_client()` uses the fake when `ANTHROPIC_API_KEY` is
  unset, so the worker runs offline in dev.
- **Pipeline** — `generate → self-review → humanize → validate` (one LLM call
  per stage; `prompts.py` holds the reviewable prompt builders). Validation here
  is a light guard; the full Validation layer is Stage 8.
- **Handler** — loads channel + persona, runs the pipeline, writes a `Post`
  (status `validated`), and enqueues the next pipeline task (`generate_image`).
  Registered via `ai_engine.register()`; stubs cover the not-yet-built engines.

Set `AI_MODEL` / `AI_EFFORT` (and `ANTHROPIC_API_KEY`) in `.env`.

## Memory / RAG (Stage 5)

`src/memory/` gives the AI Engine relevant background from a channel's knowledge
bases:

- **Embeddings** — `Embedder` protocol with `OpenAIEmbedder`
  (`text-embedding-3-small`, 1536-dim) and a deterministic `FakeEmbedder`;
  `get_embedder()` uses the fake when `EMBEDDING_API_KEY` is unset.
- **Ingest** — `ingest_document()` chunks (`chunking.py`, overlapping windows),
  embeds, and writes `knowledge_chunks.embedding` (idempotent re-ingest). It's a
  direct callable, not a queue task (a new TaskType would need an enum migration).
- **Retrieval** — cosine-distance search over pgvector; `retrieve_context_for_channel()`
  resolves a channel's knowledge bases and returns a context block.
- **Wiring** — the `generate_text` handler retrieves context and passes it to the
  generate stage; `EMBEDDING_DIM` (1536) must equal the `Vector()` column.

Set `EMBEDDING_PROVIDER` / `EMBEDDING_MODEL` / `EMBEDDING_API_KEY` / `RAG_TOP_K` in `.env`.

## Image Engine (Stage 6)

`src/image_engine/` turns a `generate_image` task into an illustrated post:

- **Provider-agnostic** — `ImageProvider` protocol with `OpenAIImageProvider`
  (`gpt-image-1`) and a deterministic `FakeImageProvider` (hash-derived PNG);
  `get_image_provider()` uses the fake when `IMAGE_API_KEY` is unset.
- **Diversity** — `prompting.py` rotates the scene/style by an attempt seed so a
  channel's images don't look same-y.
- **Dedup** — `similarity.py` computes an average hash (aHash); a candidate
  within `IMAGE_SIMILARITY_THRESHOLD` bits of a recent post is regenerated (up to
  `IMAGE_MAX_REGEN` attempts) with a different scene.
- **Storage** — `storage.py` writes the PNG under `MEDIA_ROOT` (a `media` volume
  in compose) and stores the relative path in `posts.image_path`; the aHash goes
  in `posts.meta` for future dedup. The handler then enqueues `validate`.

Set `IMAGE_PROVIDER` / `IMAGE_MODEL` / `IMAGE_API_KEY` / `IMAGE_SIZE` / `MEDIA_ROOT` in `.env`.

## Telegram Engine (Stage 7)

`src/telegram_engine/` publishes a post to its channel:

- **Provider-agnostic** — `TelegramClient` protocol with `AiogramTelegramClient`
  (Bot API) and a `FakeTelegramClient` that records sends and returns message
  ids; `get_telegram_client()` uses the fake when `TELEGRAM_BOT_TOKEN` is unset.
- **Formatting** — `formatting.py` renders plain text sized to Telegram's limits
  (1024 for a photo caption, 4096 for a text message).
- **Publish handler** — sends a photo-with-caption when an image exists on disk,
  else a text message; records `telegram_message_id` / `published_at` and sets
  status `published`. Send errors propagate so the scheduler retries with
  backoff. It then schedules `collect_metrics` (`METRICS_DELAY_SECONDS` later).

Set `TELEGRAM_BOT_TOKEN` / `METRICS_DELAY_SECONDS` in `.env`.

## Validation (Stage 8)

`src/validation/` is the gate every post passes before publication:

- **Rules** (`rules.py`, pure) — length bounds, banned-substring patterns,
  near-duplicate detection (Jaccard word-set similarity vs recent published
  posts), and a check that a referenced image actually exists on disk.
- **Compose** — `validate_post()` runs all rules and returns a `ValidationResult`
  (ok + accumulated issues).
- **Handler** — on pass, sets the post `queued` and enqueues `publish` (this is
  what closes the pipeline); on fail, sets `rejected` with the issues recorded in
  `posts.error` and nothing is published.

The pipeline now runs end-to-end:
`generate_text → generate_image → validate → publish → collect_metrics`
(`collect_metrics` is still a stub until Stage 9).

Configure via `VALIDATION_MIN_CHARS` / `VALIDATION_MAX_CHARS` /
`VALIDATION_DUPLICATE_THRESHOLD` / `VALIDATION_BANNED_PATTERNS` (JSON list).

## Analytics & self-learning (Stage 9)

`src/analytics/` closes the loop:

- **Metrics** — `collect_metrics` (the last pipeline step) fetches a snapshot via
  a `MetricsProvider` (default `FakeMetricsProvider`; Bot API metric access is
  limited) and appends a `post_metrics` row per capture.
- **Reports** (`reports.py`, pure) — aggregate the latest snapshot per post into a
  `ChannelReport`: totals, weighted engagement, top posts, best posting hour.
- **Recommendations** (`recommendations.py`, pure) — turn the report into operator
  *suggestions* (best hour, winning topics, low-forward hint). Controlled
  self-improvement: surfaced, never auto-applied.
- **Service** (`service.py`) — `build_channel_report()` assembles a report from the
  DB for the admin panel (Stage 10).

Every `TaskType` now has a real handler — the stub layer is just a safety net.

## Admin Panel (Stage 10)

`src/admin/` is a token-guarded REST API mounted on the FastAPI app under
`/admin` (interactive docs at `/docs`). Send `X-Admin-Token: <ADMIN_TOKEN>`;
when `ADMIN_TOKEN` is unset the whole API returns 503.

| Area | Endpoints |
|------|-----------|
| Personas | `POST/GET /admin/personas` |
| Channels | `POST/GET /admin/channels`, `GET /admin/channels/{id}` |
| Knowledge | `POST /admin/knowledge-bases`, `POST /admin/knowledge-bases/{id}/documents` (ingests), `POST /admin/channels/{id}/knowledge-bases/{kb_id}` (attach) |
| Schedules | `POST /admin/channels/{id}/schedules` |
| Generation | `POST /admin/channels/{id}/generate` → enqueues `generate_text` |
| Monitoring | `GET /admin/channels/{id}/posts`, `GET /admin/tasks?status=` |
| Analytics | `GET /admin/channels/{id}/analytics` → report + recommendations |

Set `ADMIN_TOKEN` in `.env`. A user can now add a channel, pick a persona,
attach knowledge, set a schedule, and run the autonomous system — the platform's
final goal from the spec.

## Deployment & operations (Stage 11)

- **CI** — [`.github/workflows/ci.yml`](.github/workflows/ci.yml): `ruff check` +
  `ruff format --check` (lint), `pytest` against Postgres+Redis services with
  `RUN_INTEGRATION=1` (runs the integration + e2e suites), and a Docker image build.
- **Migrations** — two revisions; `0002` adds an IVFFlat cosine index on
  `knowledge_chunks.embedding` so RAG search scales. `docker compose up` applies
  `alembic upgrade head` from the `app` service; the `worker` waits for `app` to
  be healthy, so migrations run exactly once.
- **Image** — runs as a non-root `appuser`; the `media` named volume inherits its
  ownership.
- **Health & restarts** — `app` has an HTTP healthcheck; every service uses
  `restart: unless-stopped`. `/health` (liveness) and `/readiness` (Postgres +
  Redis) back external probes.
- **Backups** — [`docker/backup.sh`](docker/backup.sh) writes a timestamped
  `pg_dump` gzip and prunes dumps older than 14 days (cron example in the script).
- **Production config** — set `APP_ENV=production`, `LOG_JSON=true`, real provider
  keys, and a strong `ADMIN_TOKEN`; supply secrets via the environment, not the
  image. Drop the `./src` bind mount from compose to run baked image code only.

### Testing

The default `pytest` run is dependency-free (pure logic + fakes + FastAPI
wiring). Set `RUN_INTEGRATION=1` with a migrated Postgres + Redis to also run the
DB integration and the end-to-end pipeline test
(`test_pipeline_e2e_integration.py`: enqueue `generate_text` → drain the queue →
assert a published post with an image), which exercises every engine with the
fake providers.

## Roadmap

1. **Foundation** — repo, config, Docker, health checks ✅
2. **Data layer** — models, Alembic, pgvector ✅
3. **Scheduler & Queue** — task queue, worker, retries, scheduler ✅
4. **AI Engine** — Claude text pipeline + generate_text handler ✅
5. **Memory / RAG** — embeddings, pgvector ingest/retrieval, RAG in pipeline ✅
6. **Image Engine** — provider abstraction, diversity, dedup, generate_image ✅
7. **Telegram Engine** — publish handler, formatting, photo/text sending ✅
8. **Validation** — pre-publication gate; pipeline chained end-to-end ✅
9. **Analytics & self-learning** — metrics, reports, recommendations ✅
10. **Admin Panel** — token-guarded REST management API ✅
11. **Tests, docs, production deployment** — CI, vector index, image hardening, backups ✅
