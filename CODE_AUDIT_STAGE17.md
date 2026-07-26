# CODE_AUDIT_STAGE17.md — Аудит качества кода Этапа 17 (Analytics & Observability)

**Область:** `app/analytics/*`, `app/services/analytics.py`, `tests/analytics/*`,
`tests/services/test_analytics.py`. **Дата:** 2026-07-26. **Метод:** self-review + ruff/mypy/pytest/
coverage. **Ограничение:** реальные telemetry-бэкенды/БД не вызывались.

---

## 1. Слои / архитектура (§R3.1)
- Analytics в домене: **без БД-сессии, без HTTP, без бизнес-логики движков**. `test_layering` зелёный;
  дополнительно `tests/analytics/test_independence.py` (AST-guard подсистемы).
- **stdlib-only:** домен импортирует только стандартную библиотеку (grep — нет `app.*`-кроме-`app.analytics`,
  нет SDK). Reuse `workers` `Metrics`/`EventLogger` — только адаптерами в `services/analytics.py`.
- **Независимость:** не импортирует content/validators/images/telegram/memory/rag/workers/providers
  (grep NONE); они не импортируют analytics. Циклов нет; `pipeline` ⊄ `audit_pipeline`.

## 2. Соответствие особым требованиям (1–21)
| # | Требование | Статус |
|---|---|---|
| 1 | независимая доменная подсистема | ✅ (stdlib-only) |
| 2 | не импортирует движки/memory/rag/providers/workers | ✅ (grep + guard-тест) |
| 3 | события только через Protocol | ✅ (`EventEmitter`/`EventSink`) |
| 4 | Event immutable | ✅ (frozen + read-only attrs) |
| 5 | Event Taxonomy централизована/типизирована | ✅ (нет строковых литералов) |
| 6 | Registry typed/thread-safe/extensible/детерминирован | ✅ (Lock, sorted) |
| 7 | Counters/Timers/Histograms — независимые компоненты | ✅ (3 модуля, общий Protocol) |
| 8 | Aggregation отдельно от экспорта | ✅ (`aggregation.py` не экспортирует) |
| 9 | Correlation ID — отдельная immutable-модель | ✅ |
| 10 | Audit Pipeline отделён от Analytics Pipeline | ✅ (нет взаимных импортов) |
| 11 | Export через Protocol, без SDK | ✅ (grep нет opentelemetry/prometheus) |
| 12 | Sampling — отдельная стратегия | ✅ |
| 13 | Retention — отдельная стратегия (решает, не удаляет) | ✅ |
| 14 | Tracing/Metrics/Logging — только hooks | ✅ (NoOp по умолчанию) |
| 15 | seam'ы OTel/Prometheus/external | ✅ (без реализации) |
| 16 | runtime не имитируется | ✅ (RV-16) |
| 17 | фейки детерминированы (без random) | ✅ (Clock/IdFactory-порты; sampling — sha256) |
| 18/19/20/21 | контракты/матрица/архитектура/инварианты | ✅ (STAGE17_REPORT §5–8) |

## 3. Типизация / стиль
- `mypy --strict` — **0 ошибок (314 файлов), 0 `type: ignore`**. `ruff` — All checks passed.
- Все интерфейсы — `Protocol`; DTO — `@dataclass(frozen=True, slots=True)`; read-only attrs через
  `MappingProxyType` в `__post_init__`; PEP 695 type-alias'ы (`AttrValue`/`AuditValue`/`MetricSnapshot`).
- Нет `random`/`time.time`/`datetime.now` в домене (детерминизм — инъекция `Clock`/`IdFactory`).

## 4. Корректность (ключевые точки)
- **Event immutability (req 2/4):** frozen + attributes → `MappingProxyType` (запись → `TypeError`).
- **Taxonomy (req 3/§R11.1):** `DEFAULT_DESCRIPTORS` покрывают все `EventName`; engagement → `GATED`.
- **Registry (req 6):** дубликат → ValueError; unknown → `EventNotRegistered`; `known()` sorted; Lock.
- **Collector⟂Dispatcher (req 4/5/7):** collector только принимает/семплирует/буферизует; dispatcher только
  раздаёт, сбой одного экспортёра изолируется (`ObservabilityRecord`) и не роняет остальных.
- **Sampling (req 12/17):** `RateSampler` — sha256(correlation_id)%denom (детерминизм, не salted `hash`).
- **Metrics (req 7/8/9):** counter монотонен (negative→ValueError); timer через `Clock.measure()`;
  histogram — кумулятивные бакеты + `+inf` overflow; aggregator группирует, отсортировано (name, tags);
  aggregation **не** экспортирует.
- **Audit (req 10/§R10.8):** `AuditEvent` immutable (before/after read-only); `AuditPipeline` независим,
  сбой экспортёра изолирован.
- **Export seams (req 11/15/16):** `export` → `NotImplementedError("...RV-16")`; SDK не импортируются;
  `implemented = False`.
- **Retention (req 13):** Age/Count/Category — только `partition(kept, dropped)`, без удаления.

## 5. Тесты / покрытие
- **40 offline-тестов** (taxonomy/events/correlation/registry/sampling/collector/dispatcher/metrics/
  counters/timers/histograms/aggregation/tracing/audit/observability/retention/export-seams + pipeline/
  audit-pipeline/engine + composition/adapters + independence-guard). Детерминированы.
- coverage подсистемы **~99%** (большинство модулей 100%; остаток — Protocol `...`-заглушки в
  `metrics`/`tracing` и неиспользуемая ветвь фейка).

## 6. Наблюдения / риски
| # | Наблюдение | Severity | Примечание |
|---|---|---|---|
| A | Реальный экспорт telemetry/audit/persistence/engagement не вызывались | 🟢 | по замыслу; RV-16 |
| B | `WorkersMetricsAdapter` — bridge через минимальный `Metrics` (incr/timing) | 🟡 | сигнальная семантика; high-fidelity exporter — RV-16 |
| C | Вычислительная аналитика (bandit/experiments/report/forecast §R11.4–R11.8) не входит | 🟢 | последующие стадии; seam'ы готовы |
| D | Export seams поднимают `NotImplementedError` | 🟢 | намеренно (req 16); закрытие — RV-16 |

## 7. Технический долг
Нет. `print`/`type: ignore`/`TODO`/`random`/`time.time`/`datetime.now` отсутствуют; SDK не импортируются.
Дублирования нет (reuse `workers` адаптерами). Секретов в коде нет.

## 8. Трассируемость
§R11.1/§R11.9, §R12.9/§R12.10, §R10.8, §R7.3, §R3.1/§R3.8 — Implemented + Statically Verified (offline);
экспорт/персистентность/engagement/OTel/Prometheus/внешние — Pending (RV-16). См. `TRACEABILITY_STAGE2.md`
(Этап 17, 21 требование).

## 9. Вердикт
**Этап 17 — чисто (offline).** Независимая stdlib-only подсистема Analytics & Observability: три
независимых потока (event/metrics/audit), correlation-модель, tracing/metrics/logging как hooks,
retention/sampling как отдельные стратегии, export через Protocol'ы + seam'ы без реализации. Строго
типизирован (0 `type: ignore`); ~99%. Долга нет. **Реальный экспорт/персистентность/engagement — RV-16.**
Готов к Этапу 18 после подтверждения.
