# RELEASE NOTES — Stage 17 (Analytics & Observability)

**Project:** AI Telegram Automation Platform · **Version:** 0.1.0 · **Date:** 2026-07-26
**Architecture Freeze:** ACTIVE · **SoT:** `MASTER_SPEC.md` v2.0

---

## Что сделано

**Независимая доменная подсистема Analytics & Observability** в `app/analytics` (§R11) — **stdlib-only**,
фундамент событий/метрик/аудита/трейсинга/экспорта. Ничего не импортирует из движков/подсистем/
инфраструктуры (content/validators/images/telegram/memory/rag/workers/providers) и из внешних SDK;
взаимодействие только через публичные Protocol.

- **Event flow:** immutable `Event` (read-only attrs) + **централизованная типизированная** таксономия
  (`EventCategory`/`EventName`/`EventDescriptor`, engagement — `GATED` §R7.3) → typed thread-safe
  `EventRegistry` → `EventCollector` (**только приём**) → `EventDispatcher` (**только доставка**, изоляция
  сбоя экспортёра) → exporters; **отдельная** `SamplingStrategy` (детерминированный `RateSampler`).
- **Metrics:** **отдельные** `Counter`/`Timer`(через `Clock`)/`Histogram` компоненты, typed
  `MetricRegistry`, `MetricsAggregator` — **отдельно от экспорта** (req 8); метрики только через абстрактные
  Protocol (req 8).
- **Audit:** immutable `AuditEvent` (§R10.8) + `AuditPipeline` — **полностью отдельно** от analytics
  pipeline (req 10).
- **Correlation ID** — отдельная immutable-модель; **Tracing/Metrics/Logging — только hooks** (`NoOpTracer`/
  `NoOpObservability`); `ObservabilityRecord` (§R11.9: источник/фильтры/версия алгоритма/время);
  **Retention** — отдельная стратегия (Age/Count/Category, только решает).
- **Export interfaces** — Protocol'ы; **seam'ы** OpenTelemetry/Prometheus/external analytics/external audit
  — **объявлены, не реализованы** (`NotImplementedError`, без SDK-импортов).
- **Composition** — `app/services/analytics.py`: `build_analytics_engine`/`build_analytics_pipeline`/
  `build_audit_pipeline` + тонкие адаптеры к `workers` `Metrics`/`EventLogger` (**reuse**, без дублирования).

Toolchain зелёный: ruff, mypy-strict (314 файлов, **0 `type: ignore`**), **pytest 377 passed /
6 skipped**; подсистема покрыта на **~99%**.

## ⚠️ Ограничение верификации (нет telemetry-бэкендов/БД)

Реальный экспорт **OpenTelemetry/Prometheus/внешние**, персистентность событий/аудита/снапшотов в
PostgreSQL, сбор **engagement** (§R7.3), реальные tracing-бэкенды, а также вычислительная аналитика
§R11.4–R11.8 (bandit/experiments/report/forecast) — **вне объёма Этапа 17**, отмечены **Runtime
Verification Pending (RV-16)**. Новых зависимостей нет (SDK не устанавливаются и не импортируются).

## Архитектурные инварианты (подтверждено)
- Analytics не зависит от AI/Validation/Image/Telegram Engine (grep: не импортирует content/validators/
  images/telegram/memory/rag/workers/providers; они не импортируют analytics).
- Взаимодействие только через публичные Protocol; SDK не импортируются; reuse — только адаптерами в
  композиции.
- Event⟂Metric⟂Audit; `pipeline` ⊄ `audit_pipeline`. Новых циклов нет; layering guard зелёный
  (+`tests/analytics/test_independence.py`).

## Следующий этап
**Этап 18 — Admin Panel** (§R13.1 шаг 18, §R10, HTMX + `app/api`): разделы Dashboard/Channel/Persona/
Image/Content/Knowledge/Prompt/Scheduler/Log/Analytics/Cost/Health и RBAC/audit. Начинается **только по
отдельной команде**.
