# TASK_BREAKDOWN — Stage 8 (Task Queue & Registry)

**Требует утверждения перед реализацией.** Цель (§R13.1 шаг 8): движок очереди задач поверх
**Postgres-backbone (§R2.2)** и **Redis (Этап 5)** — реестр, диспетчер, исполнитель, воркер-цикл,
ретраи/backoff, DLQ, идемпотентность, статусы. Собственная реализация (без Celery/RQ). Architecture
Freeze ACTIVE; MASTER_SPEC — SoT. Модель `tasks` и репозитории уже есть (Этап 4); Redis-примитивы —
Этап 5.

> **Область:** consumer-сторона очереди (claim → execute → transition → chain/retry/DLQ). **PRODUCER
> по расписанию** (материализация `schedules` → задачи, `run_at`, LEAD_TIME §R8.5, timezone/holiday) —
> **Этап 9 (Scheduler)**, здесь не делается (кроме `enqueue`-примитива для chaining).

## Размещение (слой)

Пакет **`app/workers/`** (§R3.5: `workers` — обработчики + `workers/run.py` entrypoint). Движок —
инфраструктура; не импортирует api/services/domain. Scheduler (Этап 9) будет ссылаться на реестр/
producer однонаправленно (workers — leaf).

---

## ⚠️ Ограничение среды (нет живого PG/Redis)

По требованию — не имитировать runtime. **Три статуса:**
- **Implemented / Statically Verified (offline):** чистые решающие функции (backoff, retry-классификация,
  переходы статусов, chaining-топология), типизированный Registry, протоколы handler/hooks, **логика
  executor'а на фейковом task-store + fake-handler** (§R2.10 offline-first), одна итерация воркера
  на фейках, сигнатуры/типы.
- **Runtime Verification Pending:** реальный `FOR UPDATE SKIP LOCKED` claim, персистентность статусов
  в Postgres, Redis-идемпотентность/rate-limit, graceful shutdown под сигналами, реальный воркер-цикл.
  Интеграционные тесты пишутся, но **пропускаются** без `RUN_INTEGRATION=1`+БД+Redis (не засчитаны).

## Особые требования владельца (1–8)
async-only; без Celery/RQ; мульти-worker (SKIP LOCKED + Redis rate-limiter); dispatcher без
бизнес-логики; Registry типизирован; статусы = DATABASE_SPEC (`task_status`); runtime не имитируется;
три статуса.

---

## Последовательность задач

### T8.0 — Предпосылки (без новых зависимостей)
- Проверить, что `sqlalchemy`/`asyncpg`/`redis` уже стоят (Этапы 4–5). Новых пакетов нет.
- **Критерий:** импорт `app.models.queue`, `app.repositories.task_repository`, `app.core.redis` OK.

### T8.1 — Task Status Flow (чистый автомат)
- `app/workers/status.py` — переходы `task_status` (§R8.3, DATABASE_SPEC): `pending→running`,
  `running→{succeeded, failed, needs_review, cancelled}`, `failed→{deferred(retry), dead(DLQ)}`,
  `deferred→pending`. Функция `next_status(current, outcome)` + таблица допустимых переходов.
- **Критерий:** 100% unit; переходы совпадают с enum DATABASE_SPEC; недопустимые → ошибка.

### T8.2 — Backoff Strategy (чистая логика)
- `app/workers/backoff.py` — экспоненциальный backoff с джиттером: база `30s`, множитель `2`,
  максимум `1h` (§Appendix B). `compute_delay(attempt) -> float`. Константы в одном месте.
- **Критерий:** 100% unit — монотонность до cap, cap соблюдён, джиттер в границах, детерминизм при фикс. seed.

### T8.3 — Retry Strategy (чистая политика)
- `app/workers/retry.py` — классификация исхода: **transient** (сеть/5xx/429) → retry (`deferred`,
  `run_at=now+backoff`) до `MAX_RETRIES=5`; **permanent** (конфиг/права/валидация) → `needs_review`
  сразу; исчерпан лимит → `dead` (DLQ §R8.11). Использует backoff. Ошибочные классы — типизированный enum.
- **Критерий:** unit на всех ветках (transient/permanent/exhausted); `MAX_RETRIES` из констант.

### T8.4 — Handler Protocol + Context/Result (точка расширения)
- `app/workers/handler.py` — `TaskHandler` **Protocol** (`async def handle(task, ctx) -> HandlerResult`);
  `HandlerContext` (session, redis, settings — зависимости, инъекция); `HandlerResult`
  (`succeeded` | `failed(error_class)` | `needs_review`). **Расширение для будущих воркеров** (этапы 12–17).
- **Критерий:** типизировано; протокол проверяем фейковым handler'ом.

### T8.5 — Task Registry (типизированный)
- `app/workers/registry.py` — `TaskRegistry`: `register(task_type, handler)`, `get(task_type)`;
  запрет двойной регистрации, ошибка на unknown type. Типизирован по `TaskType` (§R8.2).
- **Критерий:** unit (register/get/duplicate/unknown); типы.

### T8.6 — Pipeline chaining (данные топологии, не логика)
- `app/workers/pipeline.py` — **данные**: `NEXT_STAGE: dict[TaskType, TaskType | None]`
  (`generate_text→validate→generate_image→publish→collect_metrics→None`, §R2.5/§R8.4). Executor
  консультируется, сам топологию не «знает» — continuation-chaining, **не DAG** (§R8.4).
- **Критерий:** unit — цепочка соответствует §R2.5; терминал = None.

### T8.7 — Enqueue / Producer primitive (идемпотентность)
- `app/workers/producer.py` — `enqueue(session, type, channel_id, payload, run_at, dedup_key)`:
  вставка задачи; идемпотентность через `tasks.dedup_key` (Postgres — источник истины §R7.4) +
  **Redis fast-path** (IdempotencyStore, Этап 5). Используется executor'ом (chaining) и позже scheduler'ом.
- **Критерий:** сигнатуры/типы; конфликт dedup обрабатывается; **реальная вставка — RV**.

### T8.8 — Dispatcher (без бизнес-логики)
- `app/workers/dispatcher.py` — `claim(session, limit) -> Sequence[Task]`: `TaskRepository.claim_pending`
  (`FOR UPDATE SKIP LOCKED`, §R8.10) due-задач; пометка `running`. **Никакой бизнес-логики** (req 4).
- **Критерий:** сигнатуры/типы; claim делегируется репозиторию; **SKIP LOCKED — RV**.

### T8.9 — Executor (оркестрация одной задачи)
- `app/workers/executor.py` — `execute(task, ctx)`: lookup handler (Registry) → run → по `HandlerResult`:
  success → `succeeded` + enqueue next (pipeline) ; failure → retry/backoff/DLQ/needs_review (retry
  policy) с записью статуса/`run_at`/`attempts`/`last_error`; отмена (проверка `cancelled`); вызовы
  metrics/logging hooks. Персистентность — через репозиторий/сессию; **без бизнес-логики генерации**.
- **Критерий:** **offline-тесты решающего потока на фейк-store + fake-handler** (успех→chain,
  transient→deferred, permanent→needs_review, exhausted→dead, cancel); реальная персистентность — RV.

### T8.10 — Worker Lifecycle (цикл + graceful shutdown + cancellation)
- `app/workers/worker.py` — async-цикл: `dispatch → execute → (idle backoff когда пусто)`; **graceful
  shutdown** (флаг/событие: дорабатывает текущую задачу, затем стоп, §R12.4); **cancellation**
  (задача с `cancelled`/канал `paused` §R8.14 — не исполняется/прерывается на границе). Конкурентность
  — пул + распределённый rate-limiter (Redis, §R8.9).
- **Критерий:** одна итерация на фейках (offline); реальный цикл/сигналы — RV.

### T8.11 — Metrics & Logging Hooks (точки расширения)
- `app/workers/hooks.py` — Protocols `MetricsHook`/`LoggingHook` + no-op реализации по умолчанию;
  executor/worker вызывают хуки (start/finish/retry/dead/duration). Конкретные метрики/логгер — позже
  (§R12.9/§R12.10, FA-4).
- **Критерий:** типы; no-op вызывается без сайд-эффектов (unit).

### T8.12 — Worker entrypoint
- `app/workers/run.py` — `python -m app.workers.run`: собирает settings+session-factory+redis+registry
  и запускает воркер-цикл. **Запуск = RV Pending** (нужны БД+Redis). Регистрация обработчиков —
  пустая/через плагины будущих этапов (точка расширения).
- **Критерий:** импортируется; собирает зависимости; **запуск — RV**.

### T8.13 — Tests
- **Offline (unit):** status-переходы, backoff-границы, retry-классификация, registry, pipeline-цепочка,
  **executor decision-flow на фейках**, worker одна итерация на фейках, hooks no-op.
- **Integration (за `RUN_INTEGRATION=1`+БД+Redis, не запускается):** реальный claim/SKIP LOCKED,
  персистентность статусов, chaining-enqueue, DLQ, идемпотентность, rate-limit — **RV Pending**.
- **Критерий:** offline зелёные; интеграционные написаны и корректно skip.

### T8.14 — Reports + закрытие
- `STAGE8_REPORT.md`, `CODE_AUDIT_STAGE8.md`, `RELEASE_NOTES_STAGE8.md`; **обновить**
  `TECHNICAL_BACKLOG.md` (RV для queue-runtime; FA-5 — интеграция лимитера в воркер) и
  `TRACEABILITY_STAGE2.md` (§R2.2/§R8.* — три статуса). README — секция Task Queue. Серия коммитов +
  тег `stage-8-queue`.
- **Критерий:** ruff/mypy-strict/pytest зелёные (offline); секреты не в git; тег на финале.

---

## Создаваемые/изменяемые файлы

| Файл | Действие |
|---|---|
| `app/workers/__init__.py` | обновить (экспорт) |
| `app/workers/{status,backoff,retry,handler,registry,pipeline,producer,dispatcher,executor,worker,hooks,run}.py` | новые — движок очереди |
| `tests/workers/*` | новые — offline + gated integration |
| `README.md` | edit — секция Task Queue |
| `STAGE8_REPORT.md`, `CODE_AUDIT_STAGE8.md`, `RELEASE_NOTES_STAGE8.md` | новые |
| `TECHNICAL_BACKLOG.md`, `TRACEABILITY_STAGE2.md` | обновление (живые) |

## Новые зависимости
**Нет.** Всё из Этапов 4–5 (`sqlalchemy/asyncpg`, `redis`).

## Структура очереди (сводно)
`schedules`→(Scheduler, этап 9)→`tasks`(pending, run_at) → **Dispatcher**(SKIP LOCKED claim→running) →
**Executor**(Registry→Handler→result) → `succeeded`+**enqueue next**(pipeline) | retry(`deferred`,backoff)
| `dead`(DLQ) | `needs_review` | `cancelled`. Конкурентность: N воркеров + Redis rate-limiter (§R8.9).

## Task Status Flow
`created→pending→running→succeeded` · `running→failed→(attempts<MAX)deferred→pending` ·
`(attempts=MAX)→dead` · `running→needs_review` (permanent/ambiguous) · `→cancelled` (§R8.3, DATABASE_SPEC).

## Redis / PostgreSQL Integration
- **PostgreSQL:** источник истины очереди — `tasks` (§R2.2); claim `FOR UPDATE SKIP LOCKED` (§R8.10);
  идемпотентность — `tasks.dedup_key` (§R7.4); статусы/attempts/run_at персистятся.
- **Redis:** распределённый rate-limiter (§R8.9, Этап 5) для конкурентности флота; idempotency fast-path;
  (опц.) locks для координации. **Источник истины остаётся Postgres.**

## Реализуемые требования MASTER_SPEC
§R2.2 (queue-backbone) · §R2.5 (пайплайн-стадии) · §R8.1 (worker=executor) · §R8.2 (типы/статусы) ·
§R8.3 (lifecycle) · §R8.4 (continuation-chaining, не DAG) · §R8.9 (конкурентность/распред. лимитер) ·
§R8.10 (SKIP LOCKED) · §R8.11 (DLQ=dead) · §R8.14 (pause/resume/cancellation) · §R1.10 (fail-safe) ·
§R7.4 (идемпотентность) · §R7.5 (retry transient/permanent) · §Appendix B (MAX_RETRIES, backoff) ·
§R3.1 (dispatcher без бизнес-логики) · §R12.4 (graceful shutdown). §R8.5/§R8.6/§R8.13 (LEAD_TIME/tz/
holiday) — Этап 9.

## Риски

| # | Риск | Уровень | Митигация |
|---|---|---|---|
| R1 | Нет живого PG+Redis → claim/персистентность/rate-limit не проверяемы | 🟠 | RV Pending; но decision-логика + executor на фейках — offline (больше покрытия, чем этапы 3–5) |
| R2 | Chaining как данные vs бизнес-логика | 🟢 | топология — данные (`pipeline.py`), executor generic |
| R3 | Graceful shutdown / cancellation под сигналами | 🟡 | offline — одна итерация/флаги; сигналы/цикл — RV |
| R4 | Сложность executor (много веток) | 🟡 | чистые решающие функции + fake-store тесты всех веток |
| R5 | Нет доменных обработчиков (этапы 12–17) | 🟢 | executor тестируется fake-handler'ами; точка расширения |
| R6 | Идемпотентность (dedup unique + Redis) — поведение | 🟢 | Postgres источник истины; Redis fast-path; реальное — RV |
| R7 | Объём (движок целиком) | 🟡 | группировка; тонкие слои + чистая логика |

---

> **Стоп для утверждения.** К реализации приступаю только после подтверждения плана. Этап 8 без
> утверждения не начинаю.
