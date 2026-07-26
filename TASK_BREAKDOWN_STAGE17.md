# TASK_BREAKDOWN — Stage 17 (Analytics & Observability)

**Требует утверждения перед реализацией. К реализации не приступать без явного разрешения владельца.**

Цель (§R13.1 шаг 17, §R11, §R12.9/§R12.10, §R10.8): **независимая доменная подсистема Analytics &
Observability** — фундамент событий/метрик/аудита/трейсинга/экспорта: immutable **Event Model** +
централизованная типизированная **Event Taxonomy**, потокобезопасный **Event Registry**, независимые
**Collector**/**Dispatcher**, **Analytics Pipeline**, **Metrics Architecture** (Counters/Timers/Histograms +
Aggregation), **Correlation ID Model**, **Tracing Hooks**, независимый **Audit Pipeline**, **Observability
Hooks** (§R11.9), **Export Interfaces** (Protocol) с seam'ами OpenTelemetry/Prometheus/внешних систем **без
реализации**, отдельные **Sampling** и **Retention** стратегии. **Никакой реальной отправки telemetry/
analytics; никаких сетевых вызовов; только публичные Protocol; домен stdlib-only.** Architecture Freeze
ACTIVE; SoT — MASTER_SPEC.

## Границы объёма (важно)

Этап 17 — **фундамент наблюдаемости и конвейер событий/метрик/аудита**, а НЕ вычислительная аналитика.
**Вне объёма Этапа 17** (последующие стадии/§R11.4–R11.8): report generation, channel/content/CTA/cost
analysis-отчёты, recommendation engine, **self-learning bandit** (§R5.11/§R11.4), **Experiment Manager**
(§R11.6), cost forecasting (§R11.8). Здесь строится инфраструктура, поверх которой они потом встанут (через
публичные Protocol). Реальная персистентность (`analytics_snapshots`/`api_usage`/`image_usage`/`logs`/
`errors`/`audit_log`), реальный экспорт (OTel/Prometheus/внешние), сбор engagement — **RV-16**.

## Размещение (по §R3.1)

Доменный пакет **`app/analytics/`** (сейчас пустой). Домен **не открывает БД/HTTP**, **stdlib-only** —
как Validation Engine (Этап 14), для максимальной независимости (особ. треб. 1). **Не импортирует**
`app/content`, `app/validators`, `app/images`, `app/telegram`, `app/memory`, `app/rag` (треб. 2), а также
`app/workers`, `app/core/providers`, `app/api`, `app/services`, `app/db`, `app/repositories`, `sqlalchemy`,
`fastapi`. Все зависимости-вводы (часы, sink'и, exporter'ы) инъектируются через **порты-Protocol**.
Композиция и адаптеры (reuse `app/workers` `Metrics`/`EventLogger`, будущие exporter'ы, запись в БД) —
только в **`app/services/analytics.py`**. Параллельная подсистема, независимая от всех движков.

---

## ⚠️ Ограничение среды (нет реальной telemetry/БД/бэкендов)

По требованию — не имитировать runtime и не отправлять телеметрию. **Три статуса (треб. 21):**
- **Implemented / Statically Verified (offline):** весь конвейер offline на детерминированных фейках
  (FakeClock/FakeExporter/FakeEventSink/FakeMetricsExporter) — Event Model/Taxonomy/Registry, Collector,
  Dispatcher, Sampling, Analytics Pipeline, Metrics (Counters/Timers/Histograms + Aggregation), Correlation
  ID, Tracing Hooks, Audit Model + Audit Pipeline, Observability Hooks, Export Interfaces + seam'ы, Retention.
  Целевое покрытие подсистемы ~100%.
- **Runtime Verification Pending (RV-16):** реальный экспорт в **OpenTelemetry/Prometheus/внешние
  аналитические системы**, реальная **персистентность** событий/аудита/снапшотов в PostgreSQL (наследует
  RV-9), реальный сбор **engagement**-сигналов (наследует RV-15, §R7.3 gated), реальные tracing-бэкенды.
  Интеграционные тесты — `skipif` (`RUN_INTEGRATION=1`).

## Особые требования владельца (1–21) — карта на реализацию

1 Analytics — полностью независимая доменная подсистема → пакет `app/analytics/`, stdlib-only, grep-guard ·
2 не импортирует AI/Validation/Image/Telegram/Memory/RAG → проверка grep (+ workers/providers) ·
3 события только через публичные Protocol → `EventCollector` принимает через `EventEmitter`/`EventSink`
Protocol · 4 Event Model immutable → `@dataclass(frozen=True, slots=True)` · 5 Event Taxonomy
централизована и типизирована → `taxonomy.py` (StrEnum + типизированный каталог) · 6 Event Registry
типизирован/расширяем/потокобезопасен → `registry.py` (Lock, generic) · 7 Collector и Dispatcher
независимы → отдельные модули, связь только через Protocol · 8 Metrics только через абстрактные интерфейсы
→ `MetricSink`/`MetricExporter` Protocol · 9 Counters/Timers/Histograms — отдельные компоненты → 3 модуля ·
10 Correlation ID — отдельная модель → `correlation.py` · 11 Audit Pipeline независим от Analytics Pipeline
→ отдельные `audit_pipeline.py`/`pipeline.py`, без взаимных импортов · 12 Tracing только через hooks →
`Tracer` Protocol, NoOp по умолчанию · 13 Export Interfaces через Protocol → `export.py` · 14 Sampling —
отдельная стратегия → `sampling.py` (`SamplingStrategy` Protocol) · 15 Retention — отдельная стратегия →
`retention.py` (`RetentionStrategy` Protocol) · 16 seam'ы OTel/Prometheus без реализации → именованные
Protocol/классы-заглушки, `NotImplementedError`/no-op, помеч. RV-16 · 17 seam'ы внешних аналитических
систем без реализации → `ExternalAnalyticsSink` seam · 18 без реальной отправки telemetry/analytics →
только фейки/no-op · 19 Fake Exporters детерминированы → in-memory, без random/time (инъекция `Clock`) ·
20 все публичные интерфейсы — Protocol · 21 три статуса — раздел выше + отчёты.

## Ключевые архитектурные развязки

- **Домен stdlib-only, reuse — в композиции:** существующие лёгкие хуки (`app/workers/metrics.Metrics`,
  `app/workers/log.EventLogger`, `providers.observability`, `validators.observability`) — это **emit-side**
  точки. Analytics их **не импортирует** (независимость, треб. 1–2); в `services/analytics.py` пишутся
  тонкие **адаптеры** `Metrics→MetricSink` / `EventLogger→EventExporter`, чтобы существующие эмиттеры
  могли питать конвейер без дублирования. Это одобренный паттерн (как Validation stdlib-only + адаптер).
- **Event ⟂ Metric ⟂ Audit:** три независимых потока. Event = дискретное доменное событие (immutable);
  Metric = агрегат (counter/timer/histogram); Audit = запись действия администратора/системы (§R10.8).
  Audit Pipeline **не импортирует** Analytics Pipeline и наоборот (треб. 11).
- **Collector ⟂ Dispatcher (треб. 7):** Collector только принимает/нормализует/семплирует и складывает в
  буфер через `EventSink`; Dispatcher только разбирает буфер и раздаёт по `EventExporter`. Связь — Protocol,
  не прямые ссылки.
- **Детерминизм (треб. 19):** нет `random`/`time.time()`/`datetime.now()` в домене — время только через
  порт `Clock`; семплирование детерминированное (хеш `correlation_id` по модулю, не рандом).
- **§R11.9 Observability:** каждый расчёт/эмиссия сопровождается записью источника, фильтров, **версии
  алгоритма**, времени — через `ObservabilityRecord` + `ObservabilityHook`.

---

## Последовательность задач

### T17.0 — Зависимости + gate
- **Новых зависимостей нет.** OTel/Prometheus/внешние SDK — **только seam'ы**, не устанавливаются и не
  импортируются (RV-16). Домен — stdlib-only.
- **Критерий завершения:** нет новых пакетов; в `app/analytics/` нет импортов запрещённых пакетов (grep:
  `content|validators|images|telegram|memory|rag|workers|providers|api|services|db|repositories|sqlalchemy|
  fastapi|opentelemetry|prometheus`); при нужде в зависимости — СТОП + отчёт + варианты.

### T17.1 — Correlation ID Model (треб. 10)
- `app/analytics/correlation.py` — immutable `CorrelationId` (`correlation_id`, `trace_id`, `span_id`,
  `parent_span_id`, `causation_id`) + фабрика `new_correlation(clock, seed)` детерминированная (через
  инъекцию), `child_span(parent)`. Модель **отдельная**, переиспользуется Event/Trace/Audit.
- **Критерий:** frozen/slots, типизирована, детерминированная генерация (без uuid4/random в домене —
  идентификаторы через инъектируемый `IdFactory` порт); unit на стабильность/наследование span.

### T17.2 — Event Model (треб. 3, 4)
- `app/analytics/events.py` — immutable `Event` (`name: EventName`, `category: EventCategory`,
  `severity: EventSeverity`, `occurred_at`, `correlation: CorrelationId`, `source: str`,
  `attributes: Mapping[str, ...]` (frozen), `channel_id: str | None`) + `EventSeverity` StrEnum.
- **Критерий:** `@dataclass(frozen=True, slots=True)`; атрибуты неизменяемы (frozen mapping/tuple);
  типизировано; unit на immutability (setattr → FrozenInstanceError) и на channel-isolation-поле.

### T17.3 — Event Taxonomy (треб. 5)
- `app/analytics/taxonomy.py` — **централизованная типизированная** таксономия: `EventCategory` StrEnum
  (`COST`, `QUALITY`, `SYSTEM`, `CONTENT_DIVERSITY`, `PIPELINE`, `AUDIT`, `ENGAGEMENT`(gated §R7.3)),
  `EventName` StrEnum (типизированный каталог известных событий) + `EventDescriptor` (name→category→
  severity default, `availability: Availability{ALWAYS,GATED}`). Единый источник — без «магических» строк.
- **Критерий:** все известные события описаны декларативно; нет строковых литералов на местах вызова;
  gated-события помечены `GATED`; unit на полноту каталога/консистентность категорий.

### T17.4 — Event Registry (треб. 6)
- `app/analytics/registry.py` — `EventRegistry` (typed, thread-safe `Lock`, расширяемый регистрацией
  `EventDescriptor`/handler'ов): `register`/`get`/`known()` детерминированный (sorted). Дубликат →
  `ValueError`; неизвестное → `EventNotRegistered`.
- **Критерий:** типизирован (generic по дескриптору), потокобезопасен, детерминированный обход; unit
  (дубликат/unknown/сортировка).

### T17.5 — Event Collector (треб. 3, 7)
- `app/analytics/ports.py` — публичные порты: `Clock`, `IdFactory`, `EventSink`, `EventExporter`,
  `MetricSink`, `MetricExporter` (Protocol). `app/analytics/collector.py` — `EventCollector`: приём через
  `EventEmitter` Protocol → нормализация (taxonomy/registry) → sampling → запись в `EventSink` (буфер).
  **Не** экспортирует сам (это Dispatcher).
- **Критерий:** приём только через Protocol; collector не зависит от dispatcher; семплирование применяется;
  unit (accept/normalize/sampled-out/buffer).

### T17.6 — Event Dispatcher (треб. 7)
- `app/analytics/dispatcher.py` — `EventDispatcher`: читает из `EventSink`/батча → раздаёт по
  зарегистрированным `EventExporter` (fan-out, изоляция ошибок экспортёра: сбой одного не роняет других,
  логируется через Observability Hook). **Не** зависит от collector.
- **Критерий:** независим от collector; fan-out детерминирован (sorted exporters); сбой экспортёра
  изолирован; unit (fan-out/partial-failure/empty).

### T17.7 — Sampling Strategy (треб. 14)
- `app/analytics/sampling.py` — `SamplingStrategy` Protocol + реализации: `AlwaysSample`, `NeverSample`,
  `RateSampler` (детерминированный — `hash(correlation_id) % denom < num`, **без random**),
  `CategorySampler` (по `EventCategory`). Отдельная стратегия, инъектируется в Collector.
- **Критерий:** Protocol + ≥3 стратегии; детерминизм (тот же correlation_id → тот же вердикт); unit.

### T17.8 — Analytics Pipeline (треб. 7)
- `app/analytics/pipeline.py` — `AnalyticsPipeline`: `Collector → Sampling → Dispatcher → Exporters`
  как явная композиция компонентов через порты (без бизнес-логики движков). Offline end-to-end.
- **Критерий:** пайплайн собирается из независимых компонентов через Protocol; проходит событие end-to-end
  на фейках; unit (happy-path/sampled-out/exporter-failure).

### T17.9 — Metrics Architecture + Aggregation (треб. 8)
- `app/analytics/metrics.py` — `MetricSink`/`MetricExporter` Protocol (абстрактные интерфейсы, треб. 8) +
  `MetricRegistry` (typed, thread-safe) владеет метриками. `app/analytics/aggregation.py` — `MetricsAggregator`
  (snapshot набора метрик → immutable `MetricsSnapshot`; слияние/rollup по имени+тегам).
- **Критерий:** метрики только через абстрактные интерфейсы; registry потокобезопасен; snapshot immutable;
  unit (register/snapshot/rollup).

### T17.10 — Counters / Timers / Histograms (треб. 9)
- `app/analytics/counters.py` — `Counter` (монотонный, tags), `app/analytics/timers.py` — `Timer`
  (длительности через инъектируемый `Clock`, контекст-менеджер `measure()`), `app/analytics/histograms.py`
  — `Histogram` (конфигурируемые бакеты, count/sum/buckets). **Три отдельных компонента**, общий
  `Metric` Protocol.
- **Критерий:** три независимых модуля; общий Protocol; детерминизм таймера через `Clock` (без `time.time`);
  unit на каждый (increment/measure/bucketing/immutable snapshot).

### T17.11 — Tracing Hooks (треб. 12)
- `app/analytics/tracing.py` — `Tracer` Protocol (`start_span`/`end_span`/`add_event`), `Span` immutable,
  `NoOpTracer` по умолчанию. **Только hooks** — никакого реального трейсинга/экспорта. Использует
  `CorrelationId` для связи span↔trace.
- **Критерий:** трейсинг только через hooks; NoOp по умолчанию; span↔correlation связаны; реальный бэкенд —
  RV-16; unit (span lifecycle/nesting через parent_span).

### T17.12 — Audit Event Model + Audit Pipeline (треб. 11) — §R10.8
- `app/analytics/audit.py` — immutable `AuditEvent` (`actor`, `action`, `entity`, `entity_id`, `before`,
  `after`, `occurred_at`, `correlation`) — зеркалит `audit_log`-модель (без импорта моделей/БД).
  `app/analytics/audit_pipeline.py` — `AuditPipeline` (приём `AuditEvent` через `AuditSink` Protocol →
  экспорт через `AuditExporter`). **Полностью независим** от `pipeline.py` (нет взаимных импортов).
- **Критерий:** AuditEvent immutable; AuditPipeline не импортирует AnalyticsPipeline (grep) и наоборот;
  запись в реальный `audit_log` — RV-16 (композиция); unit (accept/export/immutability).

### T17.13 — Observability Hooks (§R11.9)
- `app/analytics/observability.py` — `ObservabilityHook` Protocol + immutable `ObservabilityRecord`
  (`computed_at`, `source`, `filters`, `algorithm_version`, `duration`) + `NoOpObservability`. Хук
  вызывается компонентами конвейера/метрик (§R11.9: дата, источник, фильтры, версия алгоритма, время).
- **Критерий:** каждый расчёт может записать `ObservabilityRecord`; no-op по умолчанию; unit на поля/версию
  алгоритма.

### T17.14 — Export Interfaces + Extension Seams (треб. 13, 16, 17)
- `app/analytics/export.py` — `EventExporter`/`MetricExporter`/`AuditExporter`/`SpanExporter` Protocol
  (треб. 13) + **seam'ы без реализации** (треб. 16, 17): `OpenTelemetrySpanExporter`,
  `PrometheusMetricsExporter`, `ExternalAnalyticsSink` — классы-заглушки, реализация методов →
  `raise NotImplementedError` c пометкой RV-16 (или явный no-op с флагом `implemented=False`). **Никаких
  импортов opentelemetry/prometheus.**
- **Критерий:** все экспортные контракты — Protocol; seam'ы присутствуют, но не реализованы и ничего не
  шлют; grep: нет `import opentelemetry|prometheus`; unit (seam поднимает NotImplementedError / no-op).

### T17.15 — Retention Strategy (треб. 15)
- `app/analytics/retention.py` — `RetentionStrategy` Protocol + реализации: `AgeRetention` (по возрасту
  через `Clock`), `CountRetention` (top-N), `CategoryRetention`. **Только решает** (`should_retain`/
  `partition(kept, dropped)`), **не удаляет** реальные данные (реальное применение/DELETE — RV-16/композиция).
- **Критерий:** Protocol + ≥2 стратегии; решение детерминировано (через `Clock`); не выполняет удаление;
  unit (retain/drop/partition).

### T17.16 — Fakes (треб. 18, 19)
- `app/analytics/fakes.py` — детерминированные `FakeClock` (монотонный шаг), `FakeIdFactory`
  (последовательные id), `FakeEventSink`/`FakeEventExporter`, `FakeMetricExporter`, `FakeAuditSink/Exporter`,
  `FakeSpanExporter` — in-memory, **без random/сети/времени**. Никакой реальной отправки (треб. 18).
- **Критерий:** все фейки детерминированы и воспроизводимы; ничего не шлют наружу; используются во всех
  unit-тестах.

### T17.17 — Analytics Engine (facade)
- `app/analytics/engine.py` — `AnalyticsEngine` — offline-фасад: собирает Event/Metrics/Audit/Tracing
  потоки через порты, единая точка `emit_event`/`record_metric`/`audit`/`span`. Без бизнес-логики движков.
- **Критерий:** end-to-end offline на фейках (событие + метрика + аудит + span проходят); unit-композиция.

### T17.18 — Composition root
- `app/services/analytics.py` — `build_analytics_engine(settings)` / `build_analytics_pipeline` /
  `build_audit_pipeline`: сборка на фейках по умолчанию; тонкие **адаптеры** `app/workers` `Metrics`→
  `MetricSink`, `EventLogger`→`EventExporter` (reuse, без дублирования); точки для реальных exporter'ов
  (RV-16). Только здесь допускается импорт `app/workers`/`app/core.config`.
- **Критерий:** композиция строит рабочий offline-движок; адаптеры покрыты; layering guard зелёный.

### T17.19 — Тесты + layering
- `tests/analytics/*` — по модулю: correlation, events, taxonomy, registry, collector, dispatcher, sampling,
  pipeline, metrics/aggregation, counters, timers, histograms, tracing, audit, audit_pipeline, observability,
  export(seams), retention, engine; `tests/services/test_analytics.py` — композиция/адаптеры. Обновить
  `tests/test_layering.py` при необходимости (analytics = домен). Все offline/детерминированы.
- **Критерий:** ~100% покрытие подсистемы; guard/independence-тесты зелёные; интеграционные (реальный
  экспорт/БД) — `skipif`.

### T17.20 — Gate + отчёты + живые доки + коммиты + тег
- Прогнать `ruff` (format+check), `mypy --strict` (0 ошибок, **0 `type: ignore`**), `pytest` (ожид.
  прежние + новые offline; skipped — прежние 6 + возможные integration).
- Написать `STAGE17_REPORT.md`, `CODE_AUDIT_STAGE17.md`, `RELEASE_NOTES_STAGE17.md`; обновить живые
  `TECHNICAL_BACKLOG.md` (+RV-16), `TRACEABILITY_STAGE2.md` (блок Этапа 17), README-секцию.
- 3 коммита `feat/test/docs(stage-17):` + тег `stage-17-analytics`. **СТОП на приёмку.**
- **Критерий:** все гейты зелёные; отчёты с тремя статусами; 3 коммита + 1 тег; без реализации следующего
  этапа.

---

## Создаваемые файлы (сводно)

**Домен `app/analytics/` (stdlib-only):** `__init__.py`, `ports.py`, `correlation.py`, `events.py`,
`taxonomy.py`, `registry.py`, `collector.py`, `dispatcher.py`, `sampling.py`, `pipeline.py`, `metrics.py`,
`aggregation.py`, `counters.py`, `timers.py`, `histograms.py`, `tracing.py`, `audit.py`,
`audit_pipeline.py`, `observability.py`, `export.py`, `retention.py`, `fakes.py`, `engine.py`.
**Композиция:** `app/services/analytics.py`.
**Тесты:** `tests/analytics/test_*` (по модулю) + `tests/services/test_analytics.py` (+правки
`tests/test_layering.py` при необходимости).
**Доки:** `STAGE17_REPORT.md`, `CODE_AUDIT_STAGE17.md`, `RELEASE_NOTES_STAGE17.md`; апдейт
`TECHNICAL_BACKLOG.md`, `TRACEABILITY_STAGE2.md`, `README.md`.

## Требования MASTER_SPEC, реализуемые на Этапе 17

- **§R11.1** — категории надёжной внутренней аналитики (Cost/Quality/System/Content-diversity) как
  `EventCategory`; engagement помечен **GATED** (§R7.3) — *Implemented (taxonomy/маршрутизация)*.
- **§R11.9** — Observability каждого расчёта (дата, источник, фильтры, версия алгоритма, время) —
  *Implemented* (Observability Hooks).
- **§R12.9** — единый интерфейс структурного логирования событий (таблица `logs`) — *Implemented* (Event/
  Export-контракты; запись в БД — RV-16).
- **§R12.10** — точки интеграции метрик (counters/timers) — *Implemented* (Metrics Architecture); реальный
  Prometheus — RV-16.
- **§R10.8** — Audit (`audit_log`) модель + пайплайн — *Implemented* (домен); персистентность — RV-16.
- **§R3.1 / §R3.8** — слои и расширяемость регистрацией — *Statically Verified*.
- **Частично / вне объёма:** §R11.2–R11.8 (recommendation/governance/bandit/experiment/report/forecast) —
  фундамент подготовлен (seam'ы), сами вычисления — последующие стадии. Реальный экспорт/персистентность/
  engagement — **RV-16**.

## Риски

| # | Риск | Митигируется |
|---|---|---|
| R1 | Соблазн импортировать движки/`workers` в домене → нарушение независимости | stdlib-only домен, grep-guard, reuse только адаптерами в композиции (треб. 1–2) |
| R2 | Дублирование существующих observability-хуков (`workers`/`providers`/`validators`) | адаптеры в `services/analytics.py`, а не копирование; единые Protocol |
| R3 | Смешение Event/Metric/Audit потоков | три независимых модуля/пайплайна; Audit ⟂ Analytics (треб. 11) |
| R4 | Недетерминизм (random/time) ломает тесты и треб. 19 | только `Clock`/`IdFactory`-порты; семплирование по хешу, не random |
| R5 | Seam'ы OTel/Prometheus «поедут» в реальную отправку | заглушки без импортов SDK, `NotImplementedError`/no-op, RV-16, grep |
| R6 | Раздувание объёма (23 модуля) | строгая декомпозиция ≤400 строк/модуль, общие Protocol в `ports.py` |
| R7 | Ложное впечатление о готовности engagement/экспорта | три статуса + RV-16 во всех отчётах и таксономии (GATED) |

---

## Публичные контракты Этапа 17

**Protocol (все — Stable Public Contract, если не указано иное):**
- `Clock`, `IdFactory` — инъекция времени/идентификаторов (**Stable**).
- `EventEmitter`, `EventSink`, `EventExporter` — приём/буфер/экспорт событий (**Stable**).
- `MetricSink`, `MetricExporter`, `Metric` — метрики через абстрактные интерфейсы (**Stable**).
- `SamplingStrategy` (**Stable**), `RetentionStrategy` (**Stable**).
- `Tracer`, `SpanExporter` — трейсинг-хуки/экспорт (**Stable**).
- `AuditSink`, `AuditExporter` — аудит (**Stable**).
- `ObservabilityHook` — §R11.9 (**Stable**).

**dataclass / DTO (immutable — Stable Public Contract):**
- `CorrelationId`, `Event` (+`EventSeverity`), `EventDescriptor`, `Span`, `AuditEvent`,
  `ObservabilityRecord`, `MetricsSnapshot`, `HistogramSnapshot`, `CounterSnapshot`, `TimerSnapshot`.

**Enum / Taxonomy (Stable Public Contract):** `EventCategory`, `EventName`, `EventSeverity`, `Availability`.

**Registry (Stable Public Contract):** `EventRegistry`, `MetricRegistry`.

**Pipeline / компоненты (Stable Public Contract):** `EventCollector`, `EventDispatcher`, `AnalyticsPipeline`,
`AuditPipeline`, `MetricsAggregator`, `AnalyticsEngine`, `Counter`, `Timer`, `Histogram`, `NoOpTracer`,
`NoOpObservability`.

**Стратегии (Stable Public Contract):** `AlwaysSample`/`NeverSample`/`RateSampler`/`CategorySampler`;
`AgeRetention`/`CountRetention`/`CategoryRetention`.

**Точки расширения (Stable seam — реализация RV-16):** `OpenTelemetrySpanExporter`,
`PrometheusMetricsExporter`, `ExternalAnalyticsSink` (заглушки, без SDK).

**Сервисные интерфейсы (`app/services/analytics.py` — Stable Public Contract):** `build_analytics_engine`,
`build_analytics_pipeline`, `build_audit_pipeline` (+ адаптеры `Metrics→MetricSink`,
`EventLogger→EventExporter`).

**Fakes (Internal Contract):** `FakeClock`, `FakeIdFactory`, `FakeEventSink`, `FakeEventExporter`,
`FakeMetricExporter`, `FakeAuditSink`, `FakeAuditExporter`, `FakeSpanExporter`.

---

## Матрица зависимостей

- **Новые входящие (кто импортирует `app/analytics` [новое]):** `app/services/analytics.py`,
  `tests/analytics/*`, `tests/services/test_analytics.py`. Доменные движки — **не импортируют** (проверка
  grep).
- **Новые исходящие (что импортирует `app/analytics` [новое]):** **только stdlib** (`dataclasses`, `enum`,
  `typing`, `threading`, `datetime`, `collections.abc`). **НЕ импортирует** `app/content`, `app/validators`,
  `app/images`, `app/telegram`, `app/memory`, `app/rag`, `app/workers`, `app/core/providers`, `app/api`,
  `app/services`, `app/db`, `app/repositories`, `sqlalchemy`, `fastapi`, `opentelemetry`, `prometheus`
  (проверка grep).
- **`app/services/analytics.py` исходящие:** `app/analytics`, `app/workers` (`metrics`/`log` — reuse через
  адаптеры), `app/core.config`.
- **Циклы:** отсутствуют — `analytics` ⊄ движки/подсистемы; те ⊄ `analytics`; `pipeline` ⊄ `audit_pipeline`
  и наоборот (проверка grep).
- **Layering guard:** `analytics` = домен; запрещённые (`app.api`/`app.services`/`app.repositories`/
  `app.db`/`fastapi`/`sqlalchemy`) не импортируются → `tests/test_layering.py` остаётся зелёным.

---

## Архитектурная проверка (план)

- **Соответствие MASTER_SPEC:** §R11.1/§R11.9 (внутренняя аналитика + observability каждого расчёта),
  §R12.9/§R12.10 (единое логирование/метрики), §R10.8 (audit), §R7.3 (engagement — GATED), §R3.1/§R3.8.
- **Соответствие §R3.1, §R3.8 и требованиям подсистемы аналитики:** §R3.1 — домен без БД/HTTP/бизнес-логики
  движков, композиция в `services`; §R3.8 — события/метрики/экспортёры/стратегии расширяемы регистрацией и
  инъекцией Protocol; независимость подсистемы (треб. 1–2) обеспечена stdlib-only доменом.
- **Влияние на AI Engine:** **нулевое** — `app/content` не затрагивается и не импортируется.
- **Влияние на Validation Engine:** **нулевое** — `app/validators` не используется.
- **Влияние на Image Engine:** **нулевое** — `app/images` не используется.
- **Влияние на Telegram Engine:** **нулевое** — `app/telegram` не используется (engagement-сбор — RV-16).
- **Влияние на Provider Layer:** **нулевое** — Analytics не зависит от `app/core/providers`; будущие
  provider-метрики питаются через адаптер в композиции.
- **Требуется ли изменение Architecture Freeze:** **нет** — новый доменный пакет `app/analytics/` в рамках
  существующего паттерна «Protocol + фейки → реальные адаптеры/экспортёры позже (RV)»; новых ADR нет.
- **Потенциальные архитектурные риски:** (1) независимость домена — снимается stdlib-only + grep-guard;
  (2) дублирование observability — снимается адаптерами; (3) реальный экспорт/персистентность/engagement —
  вынесены в RV-16; (4) объём — модульная декомпозиция ≤400 строк. Иных нет.

---

## Что НЕ делается на Этапе 17 (явные границы)

Реальная отправка telemetry/analytics; установка/импорт OTel/Prometheus/внешних SDK; запись в PostgreSQL
(`analytics_snapshots`/`api_usage`/`image_usage`/`logs`/`errors`/`audit_log`); сбор engagement; report
generation, recommendation engine, self-learning **bandit** (§R5.11/§R11.4), **Experiment Manager**
(§R11.6), cost forecasting (§R11.8); изменения в других движках/подсистемах; новые зависимости. Всё это —
последующие стадии и **RV-16**.

**После подготовки этого файла — СТОП. К реализации Этапа 17 не приступать без явного утверждения владельца.**
