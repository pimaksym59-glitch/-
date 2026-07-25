# TASK_BREAKDOWN — Stage 9 (Scheduler)

**Требует утверждения перед реализацией.** Цель (§R13.1 шаг 9): **Scheduler = продюсер** (§R8.1) —
сканирует `schedules`, вычисляет слоты (timezone/DST/holiday-aware), материализует задачи-головы в
очередь через **существующий Producer** (Этап 8). **Никакой бизнес-логики; не дублирует Task Queue.**
Architecture Freeze ACTIVE; MASTER_SPEC — SoT. Модель `schedules`/`tasks`, Producer, dedup — из Этапов 4/8.

## Размещение
Пакет **`app/scheduler/`** (§R3.5: `scheduler/run.py` entrypoint — продюсер задач). Инфра; не
импортирует api/services/domain. **Однонаправленно** переиспользует `app.workers` (Producer,
EventLogger, Metrics) — без дублирования очереди (§ req 8).

---

## ⚠️ Ограничение среды (нет живого PG/Redis)

По требованию — не имитировать runtime. **Три статуса:**
- **Implemented / Statically Verified (offline):** **все вычисления времени — чистые функции**
  (slot/DST/lead-time/missed-execution/holiday) с покрытием ~100%; логика scanner/materializer/
  scheduler-tick на фейках (fake schedules + fake Producer); loop (drain/stop); типы.
- **Runtime Verification Pending:** `pg_try_advisory_lock`, чтение `schedules` из БД, реальная
  материализация в `tasks`, идемпотентность (UNIQUE `dedup_key`), конкуренция N инстансов,
  `python -m app.scheduler.run`. Интеграционные тесты пишутся, **пропускаются** без
  `RUN_INTEGRATION=1`+БД (не засчитаны).

## Особые требования владельца (1–10)
async-only; без бизнес-логики; материализация **только через существующий Producer**; **не создавать
задачи напрямую**; вычисления времени — чистые функции (offline); timezone/DST/holiday по MASTER_SPEC;
мульти-инстанс без дублей; не дублировать Task Queue; runtime не имитировать; три статуса.

## Ключевые развязки (без изменения замороженного Этапа 8)
- **Идемпотентность слота** — через `dedup_key = "slot:{channel_id}:{schedule_id}:{slot_iso}"`
  (UNIQUE `dedup_key` уже в `tasks`, Stage 4). Producer **не меняется** (§ req 3/4).
- **LEAD_TIME (§R8.5):** scheduler создаёт голову пайплайна (`generate_text`) на `slot − LEAD_TIME`,
  кладёт `target_slot` в payload. «Publish ровно в слот» honored на стадии publish (Этап 16) по
  `payload.target_slot` — **chaining Этапа 8 не трогаем**. LEAD_TIME применяется, когда тип —
  голова пайплайна (`pipeline.next_stage(type) is not None`), иначе (периодические backup/cleanup/…)
  `run_at = slot`.

---

## Последовательность задач

### T9.0 — Зависимости + gate (tzdata / zoneinfo на 3.14)
- Объявить `tzdata` явной зависимостью (`pyproject`) для кросс-платформенного `zoneinfo` (§R8.6).
- **Критерий:** `ZoneInfo("Europe/Moscow")` работает; при отсутствии — СТОП+отчёт (без автодействий).

### T9.1 — Slot calculation + Timezone (чистые функции)
- `app/scheduler/timing.py` — парсинг спецификации расписания (cron **или** `day_of_week`+`time_local`)
  → следующий слот в tz канала (`zoneinfo`) → **UTC**. Плюс применение LEAD_TIME (offset) и окна
  публикации (§R8.7 — слот вне окна сдвигается к ближайшему валидному).
- **Критерий:** 100% unit; корректный tz→UTC; детерминизм при фикс. «now».

### T9.2 — DST handling (§R8.6)
- В `timing.py`: несуществующее локальное время (переход вперёд) → **сдвиг вперёд**; неоднозначное
  (переход назад) → **первое вхождение**. Явные тесты на известные DST-переходы.
- **Критерий:** unit на nonexistent/ambiguous локальных временах; правило зафиксировано.

### T9.3 — Missed-execution policy (чистая)
- `app/scheduler/missed.py` — `slots_to_materialize(schedule, since, now, *, grace)`: пропущенные
  слоты в `(since, now]` в пределах grace + ближайший будущий; старше grace — пропускаются (без флуда).
- **Критерий:** unit — пропущенные/будущие/за-grace; политика конфигурируема.

### T9.4 — Holiday handling (§R8.13, чистая)
- `app/scheduler/holidays.py` — `is_holiday(date, calendar)` + `select_plan(date, calendar)`;
  календарь — данные (per-channel/config, наполняется позже). Scheduler лишь **тегирует payload**
  (holiday/plan); выбор контента — AI (§R8.13). **Без бизнес-логики генерации.**
- **Критерий:** unit на календаре-данных; scheduler не генерирует контент.

### T9.5 — Advisory Lock Strategy (§R8.10)
- `app/scheduler/advisory.py` — обёртка `pg_try_advisory_lock`/`unlock` (async, `session.execute(text(...))`).
  Гарантирует, что материализует **один инстанс** за цикл; dedup_key — резервная защита от гонки.
- **Критерий:** SQL-текст корректен (offline); реальная блокировка — RV.

### T9.6 — Schedule Scanner
- `app/repositories/schedule_repository.py` — `list_enabled()` (data-access, §R3.1).
- `app/scheduler/scanner.py` — читает включённые расписания + статус канала (`paused` → пропуск,
  §R8.14), вычисляет due-слоты через `timing`/`missed`. DB-чтение = RV; логика — offline на фейках.
- **Критерий:** логика скана на фейковых расписаниях (offline); реальное чтение — RV.

### T9.7 — Materialization (`schedules → tasks` через Producer)
- `app/scheduler/materializer.py` — для каждого due-слота: `producer.enqueue(task_type=<head|periodic>,
  channel_id, payload={target_slot, schedule_id, slot_name, holiday?}, run_at=<slot−lead|slot>,
  dedup_key="slot:...")`. **Только через Producer; напрямую задачи не создаём** (§ req 3/4).
- **Критерий:** логика материализации на fake Producer (offline); реальная вставка/идемпотентность — RV.

### T9.8 — Scheduler Engine (tick)
- `app/scheduler/scheduler.py` — один тик: `advisory_try_lock → scan → materialize → unlock`.
  Мульти-инстанс безопасен (advisory + dedup_key). Метрики/логгер (reuse `app.workers`) на no-op default.
- **Критерий:** логика тика на фейках (lock=fake, scan=fake, producer=fake); advisory/DB — RV.

### T9.9 — Runner (loop + graceful shutdown + recovery)
- `app/scheduler/runner.py` — периодический async-loop (интервал), graceful shutdown/drain (как Worker,
  §R12.4), idle-wait. **Recovery после рестарта:** stateless — при старте повторный скан; dedup_key
  не даёт пересоздать уже материализованные слоты; missed-policy закрывает пропуски.
- **Критерий:** loop control на фейках (offline); реальный цикл/сигналы — RV.

### T9.10 — Entrypoint
- `app/scheduler/run.py` — `python -m app.scheduler.run`: собирает settings+session+advisory+scanner+
  materializer(Producer)+runner. **Запуск = RV.**
- **Критерий:** импортируется без подключения; запуск — RV.

### T9.11 — Tests
- **Offline (unit):** timing (slot/tz/UTC), DST (nonexistent/ambiguous), missed-policy, holidays,
  scanner-logic (fakes), materializer (fake Producer — проверка dedup_key/payload/run_at/lead-time),
  scheduler-tick (fakes), runner loop.
- **Integration (за `RUN_INTEGRATION=1`+БД, не запускается):** advisory lock, чтение schedules,
  реальная материализация, идемпотентность (двойной запуск не создаёт дубль) — **RV Pending**.
- **Критерий:** offline зелёные; интеграционные написаны и корректно skip.

### T9.12 — Reports + закрытие
- `STAGE9_REPORT.md`, `CODE_AUDIT_STAGE9.md`, `RELEASE_NOTES_STAGE9.md`; **обновить**
  `TECHNICAL_BACKLOG.md` (RV-8 scheduler-runtime) и `TRACEABILITY_STAGE2.md` (§R8.1/5/6/10/13/14 — три
  статуса). README — секция Scheduler. Серия коммитов + тег `stage-9-scheduler`.
- **Критерий:** ruff/mypy-strict/pytest зелёные (offline); секреты не в git; тег на финале.

---

## Создаваемые/изменяемые файлы

| Файл | Действие |
|---|---|
| `pyproject.toml` | +`tzdata` |
| `app/scheduler/__init__.py` | обновить (экспорт) |
| `app/scheduler/{timing,missed,holidays,advisory,scanner,materializer,scheduler,runner,run}.py` | новые — движок |
| `app/repositories/schedule_repository.py` | новый — data-access |
| `tests/scheduler/*` | новые — offline + gated integration |
| `README.md` | edit — секция Scheduler |
| `STAGE9_REPORT.md`, `CODE_AUDIT_STAGE9.md`, `RELEASE_NOTES_STAGE9.md` | новые |
| `TECHNICAL_BACKLOG.md`, `TRACEABILITY_STAGE2.md` | обновление (живые) |

## Новые зависимости
`tzdata` (кросс-платформенный `zoneinfo` для §R8.6). Иных нет; Producer/EventLogger/Metrics —
reuse `app.workers`.

## Реализуемые требования MASTER_SPEC
§R8.1 (scheduler=продюсер) · §R8.5 (LEAD_TIME) · §R8.6 (timezone/DST) · §R8.7 (окна публикации) ·
§R8.10 (advisory lock + идемпотентный слот) · §R8.12 (периодические сценарии как schedules) ·
§R8.13 (holiday → тег плана; генерация — AI) · §R8.14 (pause/cancellation) · §R2.2 (очередь —
материализация через Producer) · §R3.1 (без бизнес-логики) · §R12.4 (graceful shutdown).

## Риски

| # | Риск | Уровень | Митигация |
|---|---|---|---|
| R1 | Нет живого PG → advisory/скан/материализация не проверяемы | 🟠 | RV Pending; **вычисления времени — чистые, offline ~100%** |
| R2 | Корректность DST (zoneinfo) | 🟡 | тесты на известных переходах; правило nonexistent/ambiguous зафиксировано |
| R3 | tzdata на Windows/контейнере | 🟡 | явная зависимость `tzdata` (gate T9.0) |
| R4 | Missed-execution флуд | 🟡 | grace-окно; старые слоты пропускаются |
| R5 | Мульти-инстанс гонка | 🟠 | advisory lock + dedup_key; реальная конкуренция — RV |
| R6 | LEAD_TIME/publish-at-slot | 🟢 | scheduler кладёт `target_slot` в payload; honored на этапе 16 (Этап 8 не трогаем) |
| R7 | Дублирование Task Queue | 🟢 | scheduler только продюсирует; reuse Producer |

---

> **Стоп для утверждения.** К реализации приступаю только после подтверждения плана. Этап 9 без
> утверждения не начинаю.
