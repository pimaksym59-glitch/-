# CODE_AUDIT_STAGE9.md — Аудит качества кода Этапа 9 (Scheduler)

**Область:** `app/scheduler/*`, `app/repositories/schedule_repository.py`,
`app/repositories/task_repository.py` (+`existing_dedup_keys`), `tests/scheduler/*`.
**Дата:** 2026-07-25. **Метод:** self-review + ruff/mypy/pytest/coverage.
**Ограничение:** без живого PostgreSQL I/O не проверялся.

---

## 1. Слои / архитектура (§R3.1)
- Движок в `scheduler` (инфра); не импортирует api/services/domain. Guard слоёв (`test_layering`) зелёный.
- **Однонаправленный reuse `app.workers`** (Producer/EventLogger/Metrics/pipeline) — без дублирования
  Task Queue (§ req 8). Циклов нет.
- Чистое ядро (`timing`/`missed`/`holidays`) не зависит от stateful/оркестрации; scanner/materializer/
  scheduler — оркестрация над чистым ядром + инъектируемые коллабораторы.

## 2. Соответствие особым требованиям владельца (1–10)
| # | Требование | Статус |
|---|---|---|
| 1 | async-only | ✅ (все I/O-пути `async`; чистое ядро — синхронное по природе) |
| 2 | без бизнес-логики | ✅ (только slot-математика + материализация; контент — AI) |
| 3 | материализация только через существующий Producer | ✅ (`materializer` вызывает `TaskProducer.enqueue`) |
| 4 | не создавать задачи напрямую | ✅ (нет `session.add(Task(...))` в scheduler) |
| 5 | вычисления времени — чистые функции (offline) | ✅ (`timing`/`missed`/`holidays` — без I/O; 98–100%) |
| 6 | timezone/DST/holiday по MASTER_SPEC | ✅ (правило DST зафиксировано и протестировано; holiday — данные) |
| 7 | мульти-инстанс без дублей | ✅ (advisory lock + `dedup_key` pre-filter + UNIQUE backstop) |
| 8 | не дублировать Task Queue | ✅ (reuse Producer/логгер/метрик/pipeline) |
| 9 | runtime не имитировать | ✅ (integration gated `RUN_INTEGRATION=1`) |
| 10 | три статуса | ✅ (Implemented / Statically Verified / RV-8 Pending) |

## 3. Типизация / стиль
- `mypy --strict` — **0 ошибок (113 файлов)**. `ruff check`/`format` — All checks passed. **0 `type: ignore`**.
- PEP 695 дженерики в репозиториях (наследуются). Протоколы (`SlotRule`/`TaskProducer`/`SlotLock`/
  `EventLogger`/`Metrics`) структурные — фейки в тестах их удовлетворяют без наследования.
- `from __future__ import annotations` в каждом модуле; файлы ≤ ~230 строк; функции малые.

## 4. Корректность (ключевые точки)
- **DST (§R8.6):** локализация `fold=0`+`astimezone(UTC)` даёт: несуществующее → сдвиг вперёд;
  неоднозначное → первое вхождение. Эмпирически проверено на Europe/Berlin (gap 2026-03-29,
  fold 2026-10-25) + unit-тесты.
- **Enumeration через DST:** `iter_slots_utc` собирает кандидаты с margin ≥ макс. DST-сдвига и
  **сортирует** результат — later-local-минута может дать earlier-UTC у spring-forward; дедуп set.
- **Cron OR-семантика:** при ограниченных dom **и** dow — совпадение по любому (стандарт cron);
  Sunday=0/7 нормализуется. Fail-fast на битом cron (число полей/диапазон/шаг/не-число).
- **LEAD_TIME:** голова vs периодич. определяется данными `pipeline.next_stage` (без if/else по типу).
- **Идемпотентность:** pre-filter `existing_dedup_keys` (read-only) → повторный тик ничего не
  добавляет **без** `IntegrityError`; UNIQUE `dedup_key` — backstop от гонок.
- **Pause/Resume (§R8.14):** paused/archived канал → 0 слотов (skip в `due_slots`).
- **Graceful shutdown (§R12.4):** `runner` — текущий тик дренится до выхода; idle-wait просыпается по stop.

## 5. Тесты / покрытие
- **60 offline-тестов** (timing/missed/holidays/advisory/scanner/materializer/scheduler/runner) +
  1 gated integration (RV-8).
- coverage: timing 98%, missed/holidays/materializer/runner **100%**, scanner/scheduler 98%
  (непокрыты только ORM-mapping `view_from_row` и protocol-stub — исполняются в integration);
  advisory 74% / schedule_repo 75% / task_repo 58% (I/O — integration); run.py 0% (entrypoint — RV).
  Логических offline-пробелов в чистом ядре нет.

## 6. Наблюдения / риски
| # | Наблюдение | Severity | Примечание |
|---|---|---|---|
| A | **Scheduler-runtime не проверен** (advisory/скан/материализация/идемпотентность/конкуренция) | 🟠 | RV Pending → backlog RV-8 |
| B | Гонка на pre-filter между инстансами | 🟢 | advisory lock сериализует материализацию; UNIQUE `dedup_key` — backstop; проверка — RV-8 |
| C | Cron `next_slot_utc` — минутный скан до 366 дней | 🟢 | норм. daily/weekly находит за ≤7 дней; редкие правила капируются, не зацикливаются |
| D | Grace-окно/интервал/окна публикации/календарь — константы/None по умолчанию | 🟢 | конфигурируемы параметрами; источник (config/БД) — позже |
| E | run.py 0% offline | 🟢 | entrypoint; исполняется только с БД |

## 7. Технический долг
Нет. `print()` отсутствует (логирование через `EventLogger`). Магии по типам нет (данные/`pipeline`).
Дублирования дедуп-ключа нет (единый `slot_dedup_key`). Секретов в коде нет.

## 8. Трассируемость
§R8.1/5/6/7/10/12/13/14, §R2.2, §R3.1, §R12.4 — Implemented + Statically Verified; scheduler-runtime —
Pending (RV-8). См. `TRACEABILITY_STAGE2.md` (Этап 9, требования 58–69).

## 9. Вердикт
**Этап 9 — чисто (offline).** Scheduler-продюсер соответствует §R8 и всем 10 особым требованиям;
вычисления времени — чистые и покрыты на 98–100%, включая реальные DST-переходы; материализация только
через Producer Этапа 8 (не изменён); идемпотентность — pre-filter + UNIQUE `dedup_key`. Долга нет.
**Scheduler-runtime не подтверждён (нет PostgreSQL)**, вынесен в RV-8. Готов к Этапу 10 после подтверждения.
