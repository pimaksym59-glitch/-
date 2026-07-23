# STAGE8_REPORT.md — Этап 8: Task Queue & Registry

**Этап:** §R13.1 шаг 8. **Дата:** 2026-07-22. **Статус:** завершён (с DB/Redis-runtime ограничением),
ждёт подтверждения. **План:** утверждён (движок в `app/workers/`).

---

## ⚠️ Ограничение верификации (нет живого PG/Redis)

По требованию — не имитировать runtime. **Три статуса:**
- **Implemented / Statically Verified (offline):** чистые решающие функции (backoff/status/retry/
  pipeline) 100%; **весь decision-flow Executor'а на фейках 100%** (успех→chain, transient→deferred,
  exhausted→dead, permanent→needs_review, missing-handler→needs_review, cancel, hooks); реестр;
  worker-цикл (drain/stop); типы/сигнатуры.
- **Runtime Verification Pending:** реальный `FOR UPDATE SKIP LOCKED` claim, персистентность статусов,
  enqueue/dequeue, Redis-идемпотентность, конкуренция воркеров, `python -m app.workers.run`.
  Интеграционный тест написан и **пропускается** без `RUN_INTEGRATION=1`+БД+Redis (не засчитан).

## 1. Реализовано (`app/workers/`, только инфра, без Celery/RQ)

| Модуль | Роль |
|---|---|
| `status.py` | автомат переходов `task_status` (§R8.3, DATABASE_SPEC) |
| `backoff.py` | экспоненциальный backoff + джиттер (чистые функции, §Appendix B) |
| `retry.py` | классификация transient/permanent + решение retry/dead/needs_review (§R7.5) |
| `errors.py` | таксономия ошибок (Transient/Permanent/NeedsReview/HandlerNotRegistered) |
| `handler.py` | `TaskHandler` Protocol + `HandlerContext` (точка расширения) |
| `registry.py` | типизированный `TaskRegistry` (декларативный API; unknown → чистая ошибка) |
| `pipeline.py` | continuation-chaining **как данные** (§R8.4, без if/else по типам) |
| `producer.py` | `enqueue` (идемпотентность — Postgres `dedup_key`, §R7.4) |
| `dispatcher.py` | claim SKIP LOCKED (§R8.10) — **только orchestration, без бизнес-логики** |
| `executor.py` | **ядро**: единая обработка исключений/статусов/ретраев; DLQ=`dead` |
| `worker.py` | lifecycle: loop, graceful shutdown, drain, idle-wait |
| `hooks.py`/`log.py`/`metrics.py` | инфра-хуки (before/after/success/failure/retry/cancel), единый логгер (no print), точки метрик |
| `run.py` | entrypoint `python -m app.workers.run` (запуск = RV) |

Особые требования (1–11) выполнены: async-only; без Celery/RQ; мульти-worker (SKIP LOCKED + Redis
rate-limiter); dispatcher без бизнес-логики; Registry типизирован (unknown → корректная ошибка, не
падение); Executor — единая точка логики/исключений/статусов/ретраев; pipeline декларативный, без
if/else; полный worker lifecycle; retry чистыми функциями; DLQ=`dead`; hooks 6 шт.; логирование через
интерфейс; метрики — точки интеграции; runtime не имитируется.

## 2. Верификация (offline)

| Проверка | Результат |
|---|---|
| `ruff format`/`check` | All checks passed |
| `mypy --strict` | Success: 93 files |
| `pytest` | **70 passed, 4 skipped** (integration gated) |
| coverage `app.workers` | **executor 100%**, backoff/retry/status/pipeline/registry/worker/hooks/log/metrics 100%; dispatcher 82% / producer 85% (I/O — integration); run.py 0% (entrypoint — RV); TOTAL 82% |

## 3. Соответствие DATABASE_SPEC / MASTER_SPEC
Статусы = `task_status` enum (Этап 4); переходы — §R8.3; chaining — §R2.5/§R8.4; claim — §R8.10;
DLQ — §R8.11; retry/backoff — §R7.5/§Appendix B; идемпотентность — §R7.4; dispatcher без логики — §R3.1.

## 4. Созданные/изменённые файлы
`app/workers/{status,backoff,retry,errors,handler,registry,pipeline,producer,dispatcher,executor,worker,hooks,log,metrics,run}.py`
+ `__init__.py`; `tests/workers/*`; `README.md`. Новых зависимостей нет.

## 5. Технический долг
Нет TODO/FIXME/`type: ignore`/print. Backoff-константы — в `backoff.py` (при необходимости в config).

## 6. Границы (не делано)
PRODUCER по расписанию (материализация `schedules`, LEAD_TIME, timezone/holiday) — **Этап 9**.
Доменные обработчики (генерация/валидация/…) — этапы 12–17 (регистрируются в `registry`). Реальные
подключения — RV.

## 7. Итог
Движок очереди реализован полностью (registry/dispatcher/executor/worker/retry/backoff/DLQ/hooks),
строго типизирован, executor покрыт на 100% offline. DB/Redis-runtime не проверялся (нет сервисов) и
не засчитан. **Этап 9 (Scheduler) — по отдельной команде.**
