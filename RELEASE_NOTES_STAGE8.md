# RELEASE NOTES — Stage 8 (Task Queue & Registry)

**Project:** AI Telegram Automation Platform · **Version:** 0.1.0 · **Date:** 2026-07-22
**Architecture Freeze:** ACTIVE · **SoT:** `MASTER_SPEC.md` v2.0

---

## Что сделано

Собственный async-движок очереди в `app/workers` (**без Celery/RQ**), только инфраструктура:
- **TaskRegistry** — типизированный, декларативный API; отсутствие обработчика → корректная ошибка
  (`HandlerNotRegistered`), не падение процесса.
- **Dispatcher** — claim `FOR UPDATE SKIP LOCKED` (§R8.10); только orchestration, без бизнес-логики.
- **Executor** — единая точка выполнения, обработки исключений, смены статусов и retry; DLQ = `dead`.
- **Pipeline** — continuation-chaining **декларативными данными** (§R8.4), без if/else по типам.
- **Retry/Backoff** — экспоненциальный backoff + jitter + классификация transient/permanent —
  чистые функции (§R7.5/§Appendix B).
- **Worker** — lifecycle: startup, loop, graceful shutdown, drain текущей задачи, idle-wait.
- **Hooks** (before/after/success/failure/retry/cancel), единый **логгер** (no `print`), точки
  **метрик** — инфра-расширения.
- **Producer/enqueue** — идемпотентность через Postgres `tasks.dedup_key` (§R7.4); Redis — fast-path.
- **Entrypoint** `python -m app.workers.run` (мульти-worker).

Toolchain зелёный: ruff, mypy-strict (93 файла), **pytest 70 passed / 4 skipped**; **Executor
покрыт на 100% offline** (все ветки на фейках).

## ⚠️ Ограничение верификации (нет живого PG/Redis)

Реальный SKIP LOCKED claim, персистентность статусов, enqueue/dequeue, Redis-идемпотентность,
конкуренция воркеров, `python -m app.workers.run` **не проверялись** — Runtime Verification Pending
(backlog RV-7). Интеграционный тест написан, но пропущен без `RUN_INTEGRATION=1`+БД+Redis.

## Решения этапа
- Движок в `app/workers/` (по §R3.5); scheduler (Этап 9) ссылается однонаправленно.
- Chaining — данные (`pipeline.NEXT_STAGE`), executor generic.
- Статусы строго = DATABASE_SPEC `task_status`; переходы валидируются автоматом.

## Открытые риски
| Риск | Уровень | Где решается |
|---|---|---|
| Queue-runtime (SKIP LOCKED/enqueue/конкуренция) не проверен | 🟠 | при PG+Redis (RV-7) |
| Транзакционные границы claim↔execute | 🟠 | integration |
| mid-execution cancellation | 🟡 | RV / scheduler |

## Следующий этап
**Этап 9 — Scheduler** (§R13.1 шаг 9): producer по расписанию (материализация `schedules` → задачи,
`run_at`, **LEAD_TIME §R8.5**, timezone/DST §R8.6, holiday §R8.13), мульти-инстанс (advisory lock +
идемпотентный слот §R8.10). Начинается **только по отдельной команде**.
