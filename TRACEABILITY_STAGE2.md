# TRACEABILITY_STAGE2.md — Requirement → Implementation → Tests → Status

**Дата:** 2026-07-22 · **Область:** требования MASTER_SPEC, относящиеся к **Этапам 1–2**.
**Режим:** только анализ (код не менялся). Требования Этапов 3+ — вне области (ещё не должны быть
реализованы).

Легенда статуса: **✅** реализовано и покрыто тестами · **⚠️** реализовано, но есть пробел в тестах
(сообщается) · **⏳** зарезервировано, срок — позже (не является пробелом).

---

## Этап 1 — Repository Structure

| # | Требование MASTER_SPEC | Реализация | Тесты / Верификация | Статус |
|---|---|---|---|---|
| 1 | §R2.1 модульный монолит (структура) | `app/` — 23 пакета по слоям | `test_repository_structure`, `test_layering` | ✅ |
| 2 | §R3.1 слои + направление зависимостей | пакеты + docstrings; правило слоёв | `test_layering` (AST-guard) | ✅ |
| 3 | §R3.2 ORM-модели — единый дом | пакет `app/models/` | `test_repository_structure` | ✅ (пакет; модели — этап 6 ⏳) |
| 4 | §R3.5 точки входа | `app/__main__` (doctor); `main/scheduler/workers` зарезервированы | `test_repository_structure` | ✅ / ⏳ (остальные entrypoints позже) |
| 5 | §R3.6 полная типизация + `py.typed` | `app/py.typed`; `pyproject` mypy strict | `mypy --strict` (0 ошибок); `test_py_typed_marker_present` | ✅ |
| 6 | §R3.9 tests зеркалят структуру | `tests/`, `tests/core/` | структура тестов | ✅ |
| 7 | §R3.7 запрещённое (нет SQL в api, секретов в коде) | правило слоёв; секреты env-only | `test_layering`; тесты конфига | ✅ |

## Этап 2 — Configuration

| # | Требование MASTER_SPEC | Реализация | Тесты | Статус |
|---|---|---|---|---|
| 8 | §R3.4 приоритет `env > .env > yaml > defaults` | `config.settings_customise_sources` | `test_env_overrides_yaml`, `test_yaml_provides_business_defaults`, `test_env_specific_yaml_overrides_global`, `test_missing_yaml_degrades_gracefully` | ✅ |
| 9 | §R3.7 config-first (параметры в конфиге, без «магии») | поля `Settings` из §Appendix B | `test_defaults_match_appendix_b` | ✅ |
| 10 | §R12.2 секреты только из env (yaml исключает) | yaml-источник strip секретов | `test_secret_never_sourced_from_yaml`, `test_secret_from_env` | ✅ |
| 11 | §R12.2 маскирование / не в логах | `SecretStr`, `to_safe_dict`, doctor | `test_secret_not_leaked_in_repr`, `test_to_safe_dict_masks_secrets`, `test_doctor_does_not_leak_secret` | ✅ |
| 12 | §R4.6 embedding — платформенные константы | `embedding_model/embedding_dim_text/clip_dim` (платформенный уровень) | **нет явного ассерта значений** | ⚠️ (см. Gap-1) |
| 13 | §Appendix B платформенные дефолты | 10 полей-параметров с дефолтами | `test_defaults_match_appendix_b` — проверены **4 из 10** | ⚠️ (см. Gap-2) |
| 14 | fail-fast валидация (§R3.7/§R2.x) | `Field(ge/le/gt)` + URL-валидаторы | `test_validation_range/humanness/bad_url/good_url` | ✅ |
| 15 | §R2.10 `None ⇒ фейк` (задел) | секреты `SecretStr\|None=None` | `test_defaults_match_appendix_b` (openai=None); выбор фейка — этап 11 | ✅ / ⏳ (реализация фейка — этап 11) |

### Plan-level deliverables (правки владельца; не отдельные `R*`, но поставлены и покрыты)
| Фича | Реализация | Тесты | Статус |
|---|---|---|---|
| Config Doctor | `app/__main__.py` | `test_doctor_*` (5) | ✅ |
| Safe Snapshot | `Settings.to_safe_dict` | `test_to_safe_dict_masks_secrets` | ✅ |
| storage_dir validation | `model_validator` | `test_storage_dir_created` | ✅ |

---

## Обнаруженные пробелы (только сообщение, без исправления)

- **Gap-1 (§R4.6):** платформенные embedding-константы **реализованы** (`embedding_dim_text=1536`,
  `clip_dim=512`, `embedding_model`), но **нет теста**, ассертящего их значения/платформенность.
  → backlog **TG-2** (P2). Требование НЕ без реализации — только без теста.
- **Gap-2 (§Appendix B):** все 10 дефолтов **реализованы**, но тест проверяет **4 из 10**
  (`similarity_threshold`, `humanness_min`, `history_window`, `max_retries`); не проверены
  `image_window`, `max_rewrites`, `image_max_regen`, `lead_time_minutes`, `epsilon_min`,
  `max_context_tokens`. → backlog **TG-3** (P2).

> Требований **без реализации** — не обнаружено. Оба пробела — только по тестовому покрытию значений
> (реализация присутствует и типобезопасна). Исправление отложено (код не меняется в этом режиме).

---

## Этап 3 — Docker (живое обновление)

Статусы **не объединяются** — три независимых столбца. **Runtime Verified** для всех требований,
которым нужен реальный запуск контейнеров, = **Runtime Verification Pending** (Docker Engine
недоступен в среде).

| # | Требование | Implemented | Statically Verified | Runtime Verified |
|---|---|---|---|---|
| 16 | §R12.3 контейнеры = роли одного образа | ✅ `docker/Dockerfile` + compose `command`/профиль `app` | ✅ разбор compose/Dockerfile | ⏳ Runtime Verification Pending |
| 17 | §R12.4 принципы контейнеров (non-root, multi-stage, healthcheck, graceful) | ✅ `USER appuser`, builder→runtime, HEALTHCHECK, exec-form | ✅ grep/структура | ⏳ Runtime Verification Pending |
| 18 | §R12.5 reverse proxy / least exposure | ✅ Caddy; порты только у `caddy` | ✅ скрипт (только caddy публикует) | ⏳ Runtime Verification Pending |
| 19 | §R4.1 PostgreSQL 16 + pgvector | ✅ `pgvector/pgvector:pg16` + `init.sql` | ✅ статически | ⏳ Runtime Verification Pending |

> **Runtime Verification Pending** покрывает: `docker build` (+установка полного стека на 3.13),
> `docker compose config`, `caddy validate`, запуск инфры, healthcheck-переходы, `python -m app
> doctor` в контейнере, фактическое создание расширений pgvector/pg_trgm. Отслеживается в
> `TECHNICAL_BACKLOG.md` → раздел **Runtime Verification Required** (RV-1…RV-3). Требования 16–19
> **не** засчитаны как Runtime Verified.

---

## Этап 4 — Persistence Layer (живое обновление; три раздельных статуса)

| # | Требование | Implemented | Statically Verified | Runtime Verified |
|---|---|---|---|---|
| 20 | §R4.1 SQLAlchemy 2 async + Alembic | ✅ `app/db/*`, `env.py` | ✅ импорт/mypy; `alembic history` | ⏳ (`alembic upgrade` — RV-4) |
| 21 | §R4.2 базовые колонки + optimistic `version` | ✅ `Entity`/`Record` | ✅ тесты metadata + `version_id_col` | ⏳ (lock на данных — RV-5) |
| 22 | §R4.3 UUIDv7 PK (`uuid6`) | ✅ | ✅ тест v7 | n/a (offline OK) |
| 23 | §R4.4 soft delete + partial unique | ✅ | ✅ metadata (partial-unique индексы) | ⏳ (поведение — RV-5) |
| 24 | §R4.5/R4.6 векторы + размерности | ✅ (1536/512) | ✅ тесты dims | ⏳ (pgvector/HNSW — RV-5) |
| 25 | §R4.7 persona≠actor | ✅ | ✅ тест | n/a |
| 26 | §R4.8 analytics_snapshots (ряд) | ✅ | ✅ metadata | ⏳ |
| 27 | §R4.9 tasks-схема (dispatch/dedup/slot) | ✅ | ✅ тест индексов | ⏳ (SKIP LOCKED — RV-5) |
| 28 | §R4.10 все 25 таблиц | ✅ | ✅ тест | n/a |
| 29 | §R4.11-13 enums | ✅ (8, общий объект) | ✅ | ⏳ (CREATE TYPE — RV-4) |
| 30 | §R4.14 индексы (btree/partial/GIN/FTS/HNSW) | ✅ | ✅ metadata | ⏳ (создание — RV-4) |
| 31 | §R3.1 репозитории (data-access, без бизнес-логики) | ✅ `app/repositories/*` | ✅ mypy + wiring-тесты | ⏳ (запросы — RV-5) |
| 32 | §R3.2 модели — единый дом | ✅ | ✅ тест | n/a |
| 33 | §R4.11 стратегия транзакций (caller-owned) | ✅ (репо не коммитят) | ✅ ревью/тип | ⏳ (UoW на данных — RV-5) |
| 34 | §R12.6 Alembic-миграции | ✅ initial + env | ✅ config/цепочка | ⏳ (применение — RV-4) |

> **Runtime Verification Pending (RV-4/RV-5):** `alembic upgrade head`, реальные CRUD, pgvector/HNSW,
> partial-unique/optimistic-lock — требуют живого PostgreSQL. Отслеживается в TECHNICAL_BACKLOG.

---

## Этап 5 — Redis Infrastructure (живое обновление; три раздельных статуса)

| # | Требование | Implemented | Statically Verified | Runtime Verified |
|---|---|---|---|---|
| 35 | §R2.8/§R7.6/§R8.9 распределённый rate-limiter (FA-5) | ✅ `rate_limiter.py` (Lua token-bucket) | ✅ mypy + Lua присутствует | ⏳ (атомарность — RV-6) |
| 36 | §R2-CACHE/§R9 Redis-кэш (get/set/delete/exists/invalidate) | ✅ `cache.py` | ✅ wiring/сериализация | ⏳ (SET/GET — RV-6) |
| 37 | §R7.4 идемпотентность (быстрый путь; БД — источник истины) | ✅ `idempotency.py` | ✅ сигнатуры/тип | ⏳ (SET NX — RV-6) |
| 38 | §R3.7 KeyBuilder (без магических строк) | ✅ `keys.py` | ✅ тесты формата 97–100% | n/a |
| 39 | §R3.7 TTL в одном месте (без литералов) | ✅ `ttl.py` | ✅ тест (все int>0) 100% | n/a |
| 40 | Redis async manager + pool + graceful shutdown | ✅ `manager.py` | ✅ ленивость/тип | ⏳ (ping/pool — RV-6) |
| 41 | Distributed locks (≠ Postgres advisory §R8.10) | ✅ `locks.py` (Lua safe-release) | ✅ CM/тип | ⏳ (SET NX/EVAL — RV-6) |
| 42 | Pub/Sub примитив (publisher/subscriber/channel) | ✅ `pubsub.py` | ✅ сигнатуры/тип | ⏳ (доставка — RV-6) |
| 43 | §R12.2 `redis_url` — секрет только env | ✅ (manager из settings) | ✅ (raise без URL) | n/a |

> **Runtime Verification Pending (RV-6):** реальные SET/GET/EVAL(Lua)/SUBSCRIBE, атомарность
> лимитера/локов, pub/sub, connection pool — требуют живого Redis.

---

## Этап 8 — Task Queue & Registry (живое обновление; три раздельных статуса)

| # | Требование | Implemented | Statically Verified | Runtime Verified |
|---|---|---|---|---|
| 44 | §R2.2 queue-backbone (Postgres `tasks`) | ✅ dispatcher/producer | ✅ типы/wiring | ⏳ (SKIP LOCKED/enqueue — RV-7) |
| 45 | §R2.5/§R8.4 continuation-chaining (не DAG, декларативно) | ✅ `pipeline.py` | ✅ тест цепочки | n/a |
| 46 | §R8.1 worker=executor | ✅ `executor.py` | ✅ **100% offline** | ⏳ (реальный запуск — RV-7) |
| 47 | §R8.2 типы/статусы задач | ✅ (enum Этап 4) | ✅ автомат переходов | n/a |
| 48 | §R8.3 lifecycle статусов | ✅ `status.py` | ✅ тест | n/a |
| 49 | §R8.9 конкуренция/распред. лимитер | ✅ (SKIP LOCKED + Redis RL) | ✅ типы | ⏳ (мульти-worker — RV-7) |
| 50 | §R8.10 SKIP LOCKED claim | ✅ dispatcher/repo | ✅ запрос собран | ⏳ (claim — RV-7) |
| 51 | §R8.11 DLQ = `dead` | ✅ executor | ✅ тест ветки | ⏳ (персистентность — RV-7) |
| 52 | §R8.14 cancellation/pause | ✅ (cancelled-skip) | ✅ тест | ⏳ (mid-exec — RV-7) |
| 53 | §R1.10/§R7.5 fail-safe + retry classify | ✅ `retry.py` | ✅ 100% unit | n/a |
| 54 | §Appendix B backoff (30s/×2/1h/jitter) | ✅ `backoff.py` | ✅ 100% unit | n/a |
| 55 | §R7.4 идемпотентность (Postgres источник истины) | ✅ producer/`dedup_key` | ✅ типы | ⏳ (unique/Redis — RV-7) |
| 56 | §R3.1 dispatcher без бизнес-логики | ✅ | ✅ ревью | n/a |
| 57 | §R12.4 graceful shutdown/drain | ✅ `worker.py` | ✅ тест loop | ⏳ (сигналы — RV-7) |

> **Runtime Verification Pending (RV-7):** claim SKIP LOCKED, персистентность статусов, enqueue,
> идемпотентность, конкуренция воркеров, entrypoint — требуют живых PostgreSQL+Redis.

---

## Этап 9 — Scheduler (живое обновление; три раздельных статуса)

| # | Требование | Implemented | Statically Verified | Runtime Verified |
|---|---|---|---|---|
| 58 | §R8.1 scheduler=продюсер (материализация через Producer, без бизнес-логики) | ✅ `scheduler.py`/`materializer.py` | ✅ тик на фейках 98%; materializer 100% | ⏳ (реальная вставка — RV-8) |
| 59 | §R8.5 LEAD_TIME (голова на `slot−lead`, `target_slot` в payload) | ✅ `materializer.py`/`timing.apply_lead_time` | ✅ unit (head vs periodic run_at) | n/a (offline OK) |
| 60 | §R8.6 timezone/DST (UTC-хранение, IANA-расчёт; nonexistent→вперёд, ambiguous→первое) | ✅ `timing.to_utc` | ✅ **unit на реальных переходах Europe/Berlin** | n/a |
| 61 | §R8.7 publication windows (вне окна → ближайшее валидное, не отбрасывается) | ✅ `timing.shift_into_window` | ✅ unit (before/inside/after) | n/a |
| 62 | §R8.10 мульти-инстанс (advisory lock + идемпотентный слот) | ✅ `advisory.py` + `dedup_key` pre-filter | ✅ SQL-текст/ключ offline; тик skip-locked | ⏳ (реальный lock/гонка — RV-8) |
| 63 | §R8.12 периодические сценарии как schedules (backup/cleanup/reindex/health_check) | ✅ (task_type сохранён; `run_at=slot`) | ✅ unit (periodic сохраняет тип/время) | ⏳ (RV-8) |
| 64 | §R8.13 holiday → тег плана (генерация — AI) | ✅ `holidays.py` + payload-тег | ✅ unit (calendar-данные) 100% | n/a |
| 65 | §R8.14 pause/resume (paused/archived канал → пропуск) | ✅ `scanner.due_slots` | ✅ unit (paused/archived skip) | ⏳ (чтение статуса — RV-8) |
| 66 | §R8.10 recovery (stateless re-scan + missed-policy + grace) | ✅ `missed.py`/`runner.py` | ✅ unit (missed/grace/next); loop drain | ⏳ (рестарт-цикл — RV-8) |
| 67 | §R2.2 материализация в очередь через Producer (не дублирует Task Queue) | ✅ (только `TaskProducer`) | ✅ fake-producer тесты | ⏳ (RV-8) |
| 68 | §R3.1 без бизнес-логики / data-access репозиторий | ✅ `schedule_repository.py` (read-only) | ✅ mypy + wiring | ⏳ (запрос — RV-8) |
| 69 | §R12.4 graceful shutdown/drain | ✅ `runner.py` | ✅ тест loop (drain/stop/idle) | ⏳ (сигналы — RV-8) |

> **Runtime Verification Pending (RV-8):** `pg_try_advisory_lock`/`unlock`, чтение `schedules`+join,
> реальная материализация через Producer, идемпотентность (двойной тик, pre-filter + UNIQUE
> `dedup_key`), конкуренция N инстансов, `python -m app.scheduler.run` — требуют живого PostgreSQL.

---

## Этап 10 — API (живое обновление; три раздельных статуса)

| # | Требование | Implemented | Statically Verified | Runtime Verified |
|---|---|---|---|---|
| 70 | §R3.5 entrypoint `app/main.py` (`uvicorn app.main:app`) | ✅ `main.py` = `create_app()` | ✅ импорт без соединений | ⏳ (запуск сервера — RV-9) |
| 71 | §R3.1 application factory, без глобального singleton | ✅ `api/app.py` `create_app` | ✅ тест изоляции экземпляров | n/a |
| 72 | §R3.1 тонкие роуты → services (без SQL/логики в api) | ✅ health → `HealthService`; guard | ✅ `test_layering` + ревью | ⏳ (реальный сервис — RV-9) |
| 73 | §R12.4 единый lifespan, ленивая инициализация | ✅ `api/lifespan`+`services/lifecycle` | ✅ тест enter/exit без connect | ⏳ (dispose соединений — RV-9) |
| 74 | DI, без глобальных сервисов, override | ✅ `api/deps` | ✅ тест `dependency_overrides` | n/a |
| 75 | §R12.10 liveness ≠ readiness | ✅ `/health/live` + `/health/ready` | ✅ тесты 200/503 на фейках | ⏳ (реальная проба PG/Redis — RV-9) |
| 76 | Error Schema (единая); ни одно исключение не утекает | ✅ `api/errors`+`core/errors`+`schemas/errors` | ✅ тесты всех веток + request_id | n/a |
| 77 | Middleware независимы, порядок явный; request_id в логах | ✅ `middleware/{request_id,logging}` + CORS/GZip | ✅ тесты id/CORS/gzip/order | ⏳ (сквозной «по проводу» — RV-9) |
| 78 | Pagination общая, entity-agnostic (limit≤100) | ✅ `api/pagination`+`schemas/pagination` | ✅ тесты границ + `Page[T]` | n/a |
| 79 | §R10.4/R10.5 auth — точки расширения (без OAuth/JWT/RBAC) | ✅ `api/auth` (anonymous seam) | ✅ тест anonymous+override | n/a |
| 80 | §R10.1 background-tasks — seam; домен через очередь / OpenAPI без warnings | ✅ `api/background` + factory OpenAPI | ✅ тесты seam + openapi(0 warnings) | ⏳ (обслуживание — RV-9) |

> **Runtime Verification Pending (RV-9):** readiness к живым PostgreSQL/Redis, `uvicorn app.main:app`,
> lifespan против настоящих соединений, сквозной CORS/gzip — требуют живых сервисов/сервера.

---

## Этап 11 — Provider Abstractions + Fakes (живое обновление; три раздельных статуса)

| # | Требование | Implemented | Statically Verified | Runtime Verified |
|---|---|---|---|---|
| 81 | §R2.10 провайдер-абстракции с фейками; система offline | ✅ `core/providers` + доменные фейки | ✅ фейки конформны Protocol; подсистема ~98% | n/a (offline) |
| 82 | §R2.10 `get_*_provider(settings)` — real-if-key-else-fake, без исключений при отсутствии ключа | ✅ `services/providers` + `factory` | ✅ тесты выбора fake/real; missing-key не бросает | ⏳ (реальный клиент — RV-10) |
| 83 | §R3.8 расширяемость: новый провайдер = адаптер + регистрация (реестр) | ✅ `registry` (typed, thread-safe) | ✅ тесты register/get/unknown/concurrency | n/a |
| 84 | Factory не знает конкретных классов (только реестр + config) | ✅ `factory.py` | ✅ тесты (impl-agnostic) | n/a |
| 85 | Единый Protocol + health как часть контракта (§R12.10, без сети) | ✅ `base.Provider` + `health` | ✅ тесты фейков (healthy, без I/O) | n/a |
| 86 | §R7.5 единый набор ошибок; классификация совместима с retry | ✅ `errors.py` (subclass workers) | ✅ `workers.retry.classify` на провайдер-ошибках | n/a |
| 87 | Capability discovery — декларативная (без проверок по классу) | ✅ `capabilities.py` | ✅ тесты supports/require | n/a |
| 88 | Retry/Timeout/Circuit-Breaker — только точки интеграции | ✅ `resilience.py` (seams, no-op) | ✅ тесты passthrough/timeout/breaker | ⏳ (реальные политики — RV-10) |
| 89 | Metrics/Logging — только hooks (без реальных метрик) | ✅ `observability.py` (reuse workers) | ✅ тест no-op defaults | n/a |
| 90 | §R2.8/§R7.6 rate-limit — точка интеграции провайдеров | ✅ seam (FA-5) | ✅ (вызов — на адаптерных этапах) | ⏳ (реальный лимит — RV-10) |
| 91 | DI через существующую систему (переопределяемо) | ✅ `api/deps.get_provider_factory` | ✅ тест override (ASGI) | n/a |
| 92 | §R3.1 generic-инфра не импортирует домен; адаптеры в домене | ✅ `core/providers` generic | ✅ `test_layering` зелёный | n/a |

> **Runtime Verification Pending (RV-10):** реальные адаптеры вендоров (OpenAI/Anthropic/aiogram),
> живые API-вызовы и фактическое поведение Retry/Timeout/CB/rate-limit — **вне объёма Этапа 11**;
> появляются на этапах 12/15/16.

---

## Этап 12 — AI Engine (живое обновление; три раздельных статуса)

| # | Требование | Implemented | Statically Verified | Runtime Verified |
|---|---|---|---|---|
| 93 | §R5.1 оркестрация generate_text (движок = оркестратор, без правил) | ✅ `content/engine` | ✅ end-to-end на фейках; engine 100% | ⏳ (живые LLM — RV-11) |
| 94 | §R2.10 только Provider Protocols Этапа 11 (без вендорских вызовов) | ✅ `LLMProvider` через selection | ✅ guard + фейк-провайдер | ⏳ (реальный клиент — RV-11) |
| 95 | §R5.3 динамический prompt-builder (модульный, без модель-специфики) | ✅ `pipeline`+`templates` | ✅ contributors/render; extensibility | n/a |
| 96 | §R5.2/§R9.8 context ≤ `MAX_CONTEXT_TOKENS`; few-shot K=3–5 через порты | ✅ `context`+`budget`+`sources` | ✅ бюджет/усечение; порты (не БД) | ⏳ (реальная Memory/RAG — Этап 13) |
| 97 | Token budget детерминирован через `TokenEstimator` (без токенайзера) | ✅ `budget` | ✅ эвристика 100% | n/a |
| 98 | Provider selection ≠ Model selection (независимы, §R5.10) | ✅ `selection` (2 механизма) | ✅ раздельные тесты | n/a |
| 99 | §R5.10 model routing (opus/haiku) декларативно | ✅ role→tiers таблица | ✅ тесты роутинга | ⏳ (реальные модели — RV-11) |
| 100 | Structured output — отдельный слой (json_mode + Pydantic) | ✅ `structured` | ✅ parse valid/invalid; seam | ⏳ (реальный JSON-режим — RV-11) |
| 101 | §R5.5 validation — расширяемый seam (гейты — Этап 14) | ✅ `validation` (AlwaysPass) | ✅ pass/fail управляет rewrite | n/a |
| 102 | §R5.6 rewrite (`MAX_REWRITES`) ≠ infra retry | ✅ `rewrite` | ✅ цикл/исчерпание | n/a |
| 103 | §R2.9/R5.10 fallback только в движке; очередь не выбирает модель | ✅ `fallback` | ✅ tiers/permanent/exhaustion | ⏳ (реальный fallback — RV-11) |
| 104 | Streaming/Cost/Metrics/Logging — только hooks | ✅ `streaming`/`cost`+observability | ✅ no-op/recording тесты | ⏳ (реальные — RV-11) |
| 105 | §R3.1 движок в домене, без БД/HTTP/бизнес-правил | ✅ `app/content` | ✅ `test_layering` зелёный | n/a |

> **Runtime Verification Pending (RV-11):** генерация против живых LLM (Anthropic/OpenAI) — фактический
> routing/fallback/streaming/стоимость/латентность — **вне объёма Этапа 12** (наследует RV-10, с адаптерами).

---

## Этап 13 — Memory + Knowledge + RAG Foundation (живое обновление; три раздельных статуса)

| # | Требование | Implemented | Statically Verified | Runtime Verified |
|---|---|---|---|---|
| 106 | §R9.1 уровни памяти (Global/Channel/Persona/Content — scope-данные) | ✅ `memory/types` `MemoryScope`/`MemoryEntry` | ✅ unit | n/a |
| 107 | §R9.2 channel isolation = hard-filter (везде) | ✅ `rag/filters`+stores | ✅ **тесты «чужой канал отсечён»** | ⏳ (реальный WHERE — RV-12) |
| 108 | §R9.3 KB ≠ Content Memory (независимые подсистемы) | ✅ `app/rag` vs `app/memory` | ✅ guard; memory⊥knowledge (импорт-проверка) | n/a |
| 109 | §R9.4 ingestion (chunk→embed→index, прямой вызов) | ✅ `rag/knowledge.ingest_document` | ✅ unit (offline) | ⏳ (реальный store — RV-12) |
| 110 | §R9.5 semantic chunking (по смыслу, не символам) | ✅ `rag/chunking` (независимый) | ✅ unit (блоки/target/пусто) | n/a |
| 111 | §R9.6 платформенная размерность эмбеддингов | ✅ через провайдер (config) | ✅ unit | ⏳ (реальная модель — RV-12) |
| 112 | §R9.7 retrieval + reranking (hard-filters до ранга) | ✅ `retrieval`+`ranking` (раздельно) | ✅ unit (candidates/сорт) | ⏳ (RV-12) |
| 113 | §R9.8 context assembly ≤ токенов, few-shot K | ✅ `rag/assembly` (отдельно) | ✅ unit (budget/limit) | n/a |
| 114 | §R9.10 versioning (active-version filter seam) | ✅ `Metadata.active`+filter | ✅ unit | ⏳ (жизненный цикл — RV-12) |
| 115 | §R9.11 search modes (semantic; keyword/hybrid seam) | ✅ `SemanticStrategy` + strategy-Protocol | ✅ unit; hybrid — seam | ⏳ (keyword/hybrid — RV-12) |
| 116 | §R9.12 Style Memory (признаки, не тексты) | ✅ `memory/types` `StyleFeatures` | ✅ unit | n/a |
| 117 | §R9.13 observability (per-query stats) | ✅ `rag/observability` hooks | ✅ вызовы в источниках | n/a |
| 118 | §R2.10 embedding только через Provider Protocol | ✅ `rag/embedding.ProviderEmbedder` | ✅ фейк offline | ⏳ (реальный embed — RV-12) |
| 119 | §R5.2 few-shot в порты AI-движка (без изменения движка) | ✅ Memory/Knowledge реализуют порты | ✅ интеграция-тест | n/a |
| 120 | §R3.1 домен, без БД-сессии/HTTP/бизнес-правил; §R3.8 расширяемость | ✅ `app/memory`/`app/rag` | ✅ guard зелёный | n/a |

> **Runtime Verification Pending (RV-12):** реальные pgvector-store'ы, живые embedding-вызовы,
> semantic/keyword/hybrid-поиск + reranking под живыми PostgreSQL+embedding-API — **вне объёма Этапа 13**.

---

## Итог (живой)

**Этапы 1–2 (unit-верифицируемые): 15 требований.**
```
Coverage (implementation): 15 / 15 requirements
Coverage (test-asserted):  13 / 15 requirements
Gaps (impl OK, test missing): 2  → §R4.6 (Gap-1), §Appendix B полные значения (Gap-2)
Requirements without implementation: 0
```

**Этап 3 (Docker): 4 требования (§R12.3/4/5, §R4.1) — три раздельных статуса:**
```
Implemented:                4 / 4
Statically Verified:        4 / 4
Runtime Verified:           0 / 4   (Runtime Verification Pending — Docker Engine недоступен)
```

**Этап 4 (Persistence): 15 требований (§R4.*, §R3.1/3.2, §R12.6) — три раздельных статуса:**
```
Implemented:                15 / 15
Statically Verified:        15 / 15   (metadata/mappers/типы/wiring, offline; 40 тестов)
Runtime Verified:            0 / 15   (Runtime Verification Pending — нет живого PostgreSQL, RV-4/RV-5)
```

**Этап 5 (Redis): 9 требований (§R2.8/§R7.6/§R8.9, §R2-CACHE/§R9, §R7.4, §R3.7, §R12.2) — три статуса:**
```
Implemented:                 9 / 9
Statically Verified:         9 / 9   (keys/ttl/wiring offline; 13 тестов; keys/ttl coverage 100%)
Runtime Verified:            0 / 9   (Runtime Verification Pending — нет живого Redis, RV-6)
```

**Этап 8 (Task Queue): 14 требований (§R2.2/§R8.*, §R7.4-5, §Appendix B, §R3.1, §R12.4) — три статуса:**
```
Implemented:                14 / 14
Statically Verified:        14 / 14   (pure-логика + Executor 100% на фейках; 70 тестов)
Runtime Verified:            0 / 14   (Runtime Verification Pending — нет живых PG+Redis, RV-7)
```

**Этап 9 (Scheduler): 12 требований (§R8.1/5/6/7/10/12/13/14, §R2.2, §R3.1, §R12.4) — три статуса:**
```
Implemented:                12 / 12
Statically Verified:        12 / 12   (время slot/DST/missed/holiday 98–100%; scanner/materializer/
                                       tick/runner на фейках; 60 offline тестов)
Runtime Verified:            0 / 12   (Runtime Verification Pending — нет живого PostgreSQL, RV-8)
```

**Этап 10 (API): 11 требований (§R3.5, §R3.1, §R12.4, §R12.10, §R10.1/R10.4/R10.5, §R2.6, §R4.2 +
API_SPEC) — три статуса:**
```
Implemented:                11 / 11
Statically Verified:        11 / 11   (factory/errors/middleware/health/pagination/openapi на ASGI-
                                       клиенте; API-модули 94–100%; 37 offline тестов; 0 type: ignore)
Runtime Verified:            0 / 11   (Runtime Verification Pending — нет живых PG/Redis/ASGI, RV-9)
```

**Этап 11 (Providers): 12 требований (§R2.10, §R3.8, §R3.1, §R7.5, §R2.8/R7.6, §R12.10) — три статуса:**
```
Implemented:                12 / 12
Statically Verified:        12 / 12   (Protocol/registry/factory/capability/resilience/фейки offline;
                                       подсистема ~98%, core-инфра/фейки/composition 100%; 43 теста;
                                       0 type: ignore)
Runtime Verified:            n/a       (Этап 11 полностью offline; реальные адаптеры — RV-10, этапы 12/15/16)
```

**Этап 12 (AI Engine): 13 требований (§R5.1/2/3/6/10, §R2.9, §R2.10, §R9.8, §R3.1) — три статуса:**
```
Implemented:                13 / 13
Statically Verified:        13 / 13   (pipeline/context/budget/selection/structured/rewrite/fallback/
                                       hooks + engine end-to-end на фейках; подсистема ~99%, engine 100%;
                                       34 теста; 0 type: ignore)
Runtime Verified:            n/a       (Этап 12 offline на FakeLLMProvider; живые LLM — RV-11)
```

**Этап 13 (Memory + Knowledge + RAG): 15 требований (§R9.1–R9.13, §R2.10, §R5.2, §R3.1/3.8) — три статуса:**
```
Implemented:                15 / 15
Statically Verified:        15 / 15   (types/similarity/embedding/chunking/filters/stores/retrieval/
                                       ranking/assembly/knowledge/memory + composition; подсистема ~99%;
                                       50 тестов; 0 type: ignore; memory ⊥ knowledge)
Runtime Verified:            n/a       (Этап 13 offline на фейках+FakeEmbeddingProvider; pgvector/поиск — RV-12)
```

Ни одно требование Этапов 1–13 (реализованных) **не осталось без реализации**. Открытые пробелы: 2
тестовых ассерта (TG-2/TG-3, Deferred); **Runtime Verified** 0/4 Docker, 0/15 Persistence, 0/9 Redis,
0/14 Queue, 0/12 Scheduler, 0/11 API (см. TECHNICAL_BACKLOG → Runtime Verification Required,
RV-1…RV-12). Этапы 11–13 — offline-полные (real-provider/LLM/RAG runtime — RV-10/RV-11/RV-12). Блокеров
для Этапа 14 нет.
