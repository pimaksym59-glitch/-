# RELEASE NOTES — Stage 9 (Scheduler)

**Project:** AI Telegram Automation Platform · **Version:** 0.1.0 · **Date:** 2026-07-25
**Architecture Freeze:** ACTIVE · **SoT:** `MASTER_SPEC.md` v2.0

---

## Что сделано

Scheduler-**продюсер** в `app/scheduler` (§R8.1) — сканирует `schedules`, вычисляет слоты
(timezone/DST/holiday-aware) и материализует задачи-головы в очередь **через существующий Producer
Этапа 8**. Никакой бизнес-логики; Task Queue не дублируется.

- **timing.py** — чистые slot-вычисления: расписание (cron **или** `day_of_week`+`time_local`) →
  следующий слот в IANA-tz канала → **UTC**; **DST** (§R8.6): несуществующее локальное время →
  сдвиг вперёд, неоднозначное → первое вхождение (проверено на реальных переходах Europe/Berlin);
  **LEAD_TIME** (§R8.5); окна публикации (§R8.7).
- **missed.py** — missed-execution политика (§R8.10): пропущенные слоты в grace-окне + ближайший
  будущий; старше grace — отбрасываются (без флуда).
- **holidays.py** — календарь-данные (§R8.13): тегирует payload планом; выбор контента — AI.
- **advisory.py** — `pg_try_advisory_lock`/`unlock` (§R8.10): один инстанс материализует за цикл.
- **scanner.py** — читает включённые расписания + статус канала (paused/archived → пропуск, §R8.14),
  вычисляет due-слоты; логика — на чистых `ScheduleView` (offline), чтение БД — RV.
- **materializer.py** — материализация **только через `TaskProducer`**: `dedup_key`, payload
  (`target_slot`/`schedule_id`/`slot_name`/holiday), `run_at`=`slot−lead` (голова) или `slot`.
- **scheduler.py** — тик: advisory-lock → scan → **pre-filter** уже материализованных → materialize
  → commit; мульти-инстанс безопасен.
- **runner.py** — фикс-интервал loop, graceful shutdown/drain (§R12.4), stateless recovery.
- **run.py** — entrypoint `python -m app.scheduler.run` (безопасно запускать несколько; advisory-lock).

Toolchain зелёный: ruff, mypy-strict (113 файлов), **pytest 130 passed / 5 skipped**; **вычисления
времени покрыты на 98–100% offline** (включая реальные DST-переходы).

## ⚠️ Ограничение верификации (нет живого PostgreSQL)

`pg_try_advisory_lock`/`unlock`, чтение `schedules`, реальная материализация в `tasks`,
идемпотентность (двойной тик), конкуренция N инстансов, `python -m app.scheduler.run`
**не проверялись** — Runtime Verification Pending (backlog **RV-8**). Интеграционный тест написан, но
пропущен без `RUN_INTEGRATION=1`+БД.

## Решения этапа (в рамках плана; Этап 8 не изменён)
- **LEAD_TIME — payload-подход:** голова на `slot−lead`, `target_slot` в payload; honored на публикации
  (Этап 16). Chaining Этапа 8 не тронут.
- **Идемпотентность — pre-filter:** read-only `TaskRepository.existing_dedup_keys` отсекает уже
  материализованные слоты (Producer **не менялся**), повторный скан не даёт `IntegrityError`; UNIQUE
  `dedup_key` — авторитетный backstop от гонок.
- **DST — `fold=0`+`astimezone(UTC)`:** оба правила (сдвиг вперёд / первое вхождение) следуют из одной
  локализации.
- **Новая зависимость:** `tzdata` (кросс-платформенный `zoneinfo`, gate T9.0 пройден на 3.14).

## Открытые риски
| Риск | Уровень | Где решается |
|---|---|---|
| Scheduler-runtime (advisory/скан/материализация/идемпотентность/конкуренция) не проверен | 🟠 | при PostgreSQL (RV-8) |
| Гонка на pre-filter между инстансами | 🟢 | advisory lock + UNIQUE `dedup_key` (RV-8) |
| Источник окна публикации/календаря праздников | 🟢 | config/БД — позже (функции готовы) |

## Следующий этап
**Этап 10 — API** (§R13.1 шаг 10): FastAPI + `app/main.py`. Начинается **только по отдельной команде**.
