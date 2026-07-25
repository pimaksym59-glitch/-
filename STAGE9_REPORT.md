# STAGE9_REPORT.md — Этап 9: Scheduler

**Этап:** §R13.1 шаг 9. **Дата:** 2026-07-25. **Статус:** завершён (с PostgreSQL-runtime
ограничением), ждёт подтверждения. **План:** утверждён (`TASK_BREAKDOWN_STAGE9.md`, движок в
`app/scheduler/`).

---

## ⚠️ Ограничение верификации (нет живого PostgreSQL)

По требованию — не имитировать runtime. **Три статуса:**
- **Implemented / Statically Verified (offline):** **все вычисления времени — чистые функции**
  (slot/tz→UTC/DST/lead-time/missed/holiday/window) с покрытием **98–100%**; логика scanner/
  materializer/scheduler-tick на фейках (fake schedules + fake Producer + fake advisory);
  runner-loop (drain/stop/idle); типы/сигнатуры.
- **Runtime Verification Pending (RV-8):** `pg_try_advisory_lock`/`unlock`, чтение `schedules`+join
  channel, реальная материализация в `tasks` через Producer, идемпотентность (двойной тик не создаёт
  дубль — pre-filter + UNIQUE `dedup_key`), конкуренция N инстансов, `python -m app.scheduler.run`.
  Интеграционный тест написан и **пропускается** без `RUN_INTEGRATION=1`+БД (не засчитан).

## T9.0 — Gate (tzdata / zoneinfo на 3.14)
`tzdata 2026c` установлен; `ZoneInfo("Europe/Moscow")` работает на Python 3.14.6. Зависимость
`tzdata` объявлена явно в `pyproject.toml` (кросс-платформенный `zoneinfo`, §R8.6). Gate пройден.

## 1. Реализовано (`app/scheduler/`, только инфра-продюсер, без бизнес-логики)

| Модуль | Роль |
|---|---|
| `timing.py` | **чистые** slot-вычисления: `resolve_tz`, `to_utc` (DST-правило), `is_imaginary`/`is_ambiguous`, `CronRule`/`WeeklyRule`/`build_rule`, `parse_cron` (5-полей, `*`/списки/диапазоны/шаги), `next_slot_utc`, `iter_slots_utc`, `apply_lead_time`, `PublicationWindow`/`shift_into_window` (§R8.5-R8.7) |
| `missed.py` | **чистая** missed-execution политика: пропущенные в grace-окне + ближайший будущий; старше grace — отбрасываются (§R8.10) |
| `holidays.py` | **чистый** календарь-данные: `is_holiday`/`select_plan` → тег плана в payload (генерация — AI, §R8.13) |
| `advisory.py` | обёртка `pg_try_advisory_lock`/`unlock` (async, `text()`), `lock_key` (signed int64), CM `hold` (§R8.10) |
| `scanner.py` | `ScheduleView`/`DueSlot` (pure), `view_from_row` (ORM→view), `due_slots` (paused/archived skip §R8.14; delegate timing/missed) |
| `materializer.py` | материализация due-слотов **только через `TaskProducer`**: `dedup_key`, payload (`target_slot`/`schedule_id`/`slot_name`/holiday), `run_at`=`slot−lead` (голова) или `slot` (периодич.); `slot_dedup_key` (§R8.1/5/13) |
| `scheduler.py` | `SchedulerEngine.tick`: advisory-lock → scan → **filter_new** (pre-filter) → materialize → commit; `TickResources` (инъекция); logger/metrics reuse `app.workers` (§R8.1/10) |
| `runner.py` | `SchedulerRunner`: фикс-интервал loop, graceful shutdown/drain/idle-wait; stateless recovery (§R12.4) |
| `run.py` | entrypoint `python -m app.scheduler.run` (запуск = RV) |
| `app/repositories/schedule_repository.py` | `list_enabled_with_channel` (read-only join, §R3.1) |
| `app/repositories/task_repository.py` | +`existing_dedup_keys` (read-only pre-filter для идемпотентности) |

Особые требования владельца (1–10) выполнены: async-only; без бизнес-логики; материализация только
через существующий Producer (задачи напрямую не создаём); вычисления времени — чистые offline;
timezone/DST/holiday по MASTER_SPEC; мульти-инстанс без дублей (advisory + `dedup_key` + pre-filter);
Task Queue не дублируется (reuse Producer/EventLogger/Metrics однонаправленно); runtime не имитируется;
три статуса.

## 2. Ключевые инженерные решения (в рамках плана; Этап 8 не изменён)
- **DST-правило (§R8.6)** реализовано локализацией `fold=0` + `astimezone(UTC)`: несуществующее
  локальное время → сдвиг вперёд, неоднозначное → первое вхождение. **Проверено на реальных
  переходах Europe/Berlin** (2026-03-29 gap, 2026-10-25 fold).
- **LEAD_TIME (§R8.5)** — payload-подход: голова (`pipeline.next_stage(type) is not None`) на
  `slot−lead`, `target_slot` в payload; периодические — на `slot`. Chaining Этапа 8 не тронут.
- **Идемпотентность** — pre-filter уже материализованных слотов через read-only
  `TaskRepository.existing_dedup_keys` (Producer не менялся): повторный скан **не** приводит к
  `IntegrityError`, просто ничего не добавляет. UNIQUE `dedup_key` — авторитетный backstop от гонок.

## 3. Верификация (offline)

| Проверка | Результат |
|---|---|
| `ruff format`/`check` | All checks passed |
| `mypy --strict` | Success: 113 files |
| `pytest` | **130 passed, 5 skipped** (все skipped = gated integration) |
| новых offline-тестов Этапа 9 | **60** (timing/missed/holidays/advisory/scanner/materializer/scheduler/runner) |
| coverage `app.scheduler` | timing 98%, missed/holidays/materializer/runner **100%**, scanner/scheduler 98%; advisory 74% / schedule_repo 75% / task_repo 58% (I/O — RV); run.py 0% (entrypoint — RV) |

## 4. Созданные/изменённые файлы
Новые: `app/scheduler/{timing,missed,holidays,advisory,scanner,materializer,scheduler,runner,run}.py`,
`app/repositories/schedule_repository.py`, `tests/scheduler/*` (9 файлов),
`STAGE9_REPORT.md`/`CODE_AUDIT_STAGE9.md`/`RELEASE_NOTES_STAGE9.md`. Изменены: `app/scheduler/__init__.py`
(экспорт), `app/repositories/task_repository.py` (+`existing_dedup_keys`), `pyproject.toml` (+`tzdata`),
`README.md` (секция Scheduler), `TECHNICAL_BACKLOG.md` (RV-8), `TRACEABILITY_STAGE2.md` (Этап 9).
Новая зависимость: `tzdata`.

## 5. Технический долг
Нет TODO/FIXME/`type: ignore`/`print`. Grace-окно — константа `missed.DEFAULT_GRACE` (при
необходимости — в config, как backoff Этапа 8). Календарь праздников — данные (наполнение per-channel
/config — позже; scheduler лишь тегирует).

## 6. Границы (не делано)
Реальные подключения/материализация/advisory — RV-8 (нет PostgreSQL). Источник окна публикации и
календаря праздников (config/БД) — позже; функции реализованы и протестированы, но в scanner/
materializer по умолчанию не заведены (None). Honor `target_slot` на публикации — Этап 16. Доменной
генерации нет (только тег плана).

## 7. Итог
Scheduler-продюсер реализован полностью (timing/missed/holidays/advisory/scanner/materializer/engine/
runner/entrypoint), строго типизирован; **вычисления времени — чистые, offline 98–100%**; материализация
только через Producer Этапа 8; идемпотентность — pre-filter + UNIQUE `dedup_key`. PostgreSQL-runtime не
проверялся (нет сервиса) и не засчитан (RV-8). **Этап 10 (API) — по отдельной команде.**
