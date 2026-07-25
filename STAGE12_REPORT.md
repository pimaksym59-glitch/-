# STAGE12_REPORT.md — Этап 12: AI Engine

**Этап:** §R13.1 шаг 12. **Дата:** 2026-07-25. **Статус:** завершён (полностью offline), ждёт
подтверждения. **План:** утверждён (`TASK_BREAKDOWN_STAGE12.md` + 15 доп. требований владельца).

---

## ⚠️ Ограничение верификации (нет реальных LLM)

По требованию — не имитировать runtime. **Три статуса:**
- **Implemented / Statically Verified (offline):** движок целиком offline на `FakeLLMProvider`
  (Этап 11) + фейковых context-источниках — pipeline, context-builder, шаблоны, token-budget,
  provider/model selection, structured-output, validation-seam, rewrite/fallback-поток, streaming/
  cost/metrics/logging hooks, end-to-end. Покрытие подсистемы **~99%** (engine 100%).
- **Runtime Verification Pending (RV-11):** генерация против **живых** LLM (Anthropic/OpenAI) —
  фактический model-routing/fallback/streaming/стоимость/латентность. Наследует RV-10 (реальные
  адаптеры); появляется с адаптерными этапами.

## 1. Реализовано (`app/content/`, доменная оркестрация, без бизнес-правил)

| Модуль | Роль |
|---|---|
| `types.py` | контракты: `Role`, `PromptSpec`/`PromptPart`, `GenerationRequest`/`GenerationResult`, `Usage` (данные) |
| `pipeline.py` | **модульный** prompt-pipeline: `PromptContributor` + вкладчики (task/persona/topic/constraints) + `PromptBuilder` (структура, без моделей) |
| `templates.py` | рендер частей → промпт (per-`PromptType` преамбула; §R5.3; без модель-специфики) |
| `sources.py` | порты `MemoryContextSource`/`KnowledgeContextSource` (§R5.2; реальные — Этап 13) |
| `fakes.py` | Empty/Fixed context-источники (offline, детерминированы) |
| `budget.py` | `TokenEstimator` (эвристика, pluggable) + `fit_within` (детерминированное усечение под окно) |
| `context.py` | context-builder: few-shot K=3–5 **через порты** (не БД) + бюджет ≤ `MAX_CONTEXT_TOKENS` |
| `selection.py` | `ProviderSelector` (только провайдер) + `ModelRouter` (только модель, декларативно) — **независимы** |
| `structured.py` | **отдельный слой**: `StructuredOutputParser[T]` + `StructuredOutputValidator` (json+Pydantic) |
| `validation.py` | `OutputValidator` seam + `AlwaysPass` (гейты §R5.5 — Этап 14) |
| `rewrite.py` | quality-rewrite (`MAX_REWRITES`, §R5.6) — **отдельно от infra retry** |
| `fallback.py` | model-tier fallback (§R2.9/R5.10) в движке; `GenerationExhausted` → очередь reschedule |
| `streaming.py` / `cost.py` | seam'ы (StreamSink / CostSink) — только точки интеграции, no-op |
| `engine.py` | **`AIEngine`** — оркестратор: select→route→build→context→generate(+fallback)→validate→rewrite; cost/stream/metrics/log hooks |
| `services/ai.py` | composition `build_ai_engine` (offline-дефолты; factory Этапа 11) |

## 2. Соответствие 15 доп. требованиям владельца
1 движок = оркестратор без правил ✅ · 2 каждый этап — отдельный модуль, расширяемо ✅ · 3 prompt-builder
без моделей (структура) ✅ · 4 provider selection — только провайдер ✅ · 5 model selection независим,
декларативные правила ✅ · 6 контекст только через Memory/Knowledge порты, без БД ✅ · 7 token-budget
детерминирован, только `TokenEstimator` ✅ · 8 structured output — отдельный слой ✅ · 9 validation
расширяем (гейты позже) ✅ · 10 rewrite отделён от retry ✅ · 11 fallback только в движке; очередь не
выбирает модель ✅ · 12 streaming — только seam ✅ · 13 cost — только hooks ✅ · 14 logging/metrics —
инфра-hooks ✅ · 15 runtime не имитируется, три статуса ✅.

## 3. Верификация (offline)
| Проверка | Результат |
|---|---|
| `ruff format`/`check` | All checks passed |
| `mypy --strict` | Success: 202 files, **0 `type: ignore`** |
| `pytest` | **244 passed, 6 skipped** (все skipped = ранее-gated integration; Этап 12 без RV-тестов) |
| coverage подсистемы | **~99%** (engine 100%; pipeline 97%, fakes 90% — тривиальные ветви) |

## 4. Технический долг
Нет TODO/FIXME/`type: ignore`/`print`/`random`. Reuse `providers.observability`/`workers` (metrics/
logging) — без дублирования. `Role.headline` вместо `title` (избегает затенения `str.title` на StrEnum).
Секретов в коде нет.

## 5. Границы (не делано)
Реальные LLM-вызовы — RV-11. Правила §R5.4–R5.11 (self-review/humanization/дедуп/topic-diversity/
bandit) — этапы 14/17 через validation-seam/inputs. Реальные Memory/RAG — Этап 13 (порты готовы).
Реальный токенайзер/стриминг/биллинг — позже (seam'ы готовы).

## 6. Итог
AI-движок реализован полностью и **offline**: provider-agnostic оркестратор поверх Protocol'ов Этапа 11;
модульный pipeline, независимые provider/model selection, structured-output слой, quality-rewrite ≠ infra
retry, model-fallback только в движке, token-budget детерминирован; streaming/cost/metrics/logging —
hooks. Долга нет. **Этап 13 (Memory/RAG) — по отдельной команде.**

---

## Архитектурная проверка

- **Соответствие MASTER_SPEC:** реализованы §R5.1/2/3/6/10 (оркестрация генерации), §R2.9 (fallback-
  каскад), §R2.10 (только Provider Protocols), §R9.8 (context ≤ бюджета), §R3.1 (движок в домене).
- **Соответствие §R5, §R2.9, §R2.10, §R3.1 и §R3.8:** §R5 — стадии/prompt-builder/context/rewrite/
  routing реализованы как оркестрация; гейты качества (§R5.5–R5.9) — seam (Этап 14). §R2.9 — model-
  fallback в движке; §R2.10 — вендорских вызовов нет. §R3.1 — без БД/HTTP/бизнес-правил; guard зелёный.
  §R3.8 — contributors/validators/sources/templates/model-routing расширяемы без правки ядра.
- **Архитектурные отклонения:** нет. Правила §R5.4–R5.11 намеренно отложены (Validation ДО движков не
  нарушено: движок даёт validation-seam, гейты — Этап 14).
- **Изменение Architecture Freeze:** **не требуется.** Новые модули — в существующем доменном пакете
  `app/content`; порты Memory/Knowledge — тот же паттерн, что провайдеры на Этапе 11. Новых ADR нет.
- **Новые архитектурные риски:** только «бизнес-логика может просочиться в движок» — митигировано
  правилом «движок = оркестрация, правила = seam/inputs». Иных системных рисков нет.
