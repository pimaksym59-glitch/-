# STAGE14_REPORT.md — Этап 14: Validation Engine

**Этап:** §R13.1 шаг 14. **Дата:** 2026-07-26. **Статус:** завершён (полностью offline), ждёт
подтверждения. **План:** утверждён (`TASK_BREAKDOWN_STAGE14.md` + 19 доп. требований владельца).

---

## ⚠️ Ограничение верификации (нет реальных LLM/embedding)

По требованию — не имитировать runtime. **Три статуса:**
- **Implemented / Statically Verified (offline):** rule-engine/registry/pipeline, модели Severity/
  Finding/Report, dedup (trigram/sentence — чистый текст), humanization (стоп-лист — чистый),
  persona/policy (чистые), quality-gates, rewrite-decision, hooks, фейк-порты. Покрытие ~99%.
- **Runtime Verification Pending (RV-13):** реальный **LLM-judge** (humanness §R5.8) и **vector-стадия
  dedup** (§R5.7 через Memory/RAG+embeddings), ML-валидаторы.

## 1. Реализовано (`app/validators/` — независимая подсистема, stdlib-only)

| Модуль | Роль |
|---|---|
| `models.py` | `Severity` (модель, §R5.9) + `Finding`/`ValidationReport` (immutable) |
| `ports.py` | `DuplicationChecker`/`HumannessScorer` — порты (Memory/RAG/LLM за границей) |
| `rules.py` | `Rule` Protocol + `RuleContext` (immutable); ML-validators = точка расширения |
| `registry.py` | `RuleRegistry` — типизирован, потокобезопасен, детерминирован (sorted) |
| `pipeline.py` | `ValidationPipeline` — прогон правил → findings (одна ответственность) |
| `gates.py` | `QualityGatePolicy` — **декларативно** (blocking-severity + soft-rules) |
| `decision.py` | `decide` → accept/rewrite/needs_review — **только решение** (§R5.6) |
| `deduplication.py` | §R5.7 каскад: trigram Jaccard → sentence overlap → vector-порт |
| `humanization.py` | §R5.8/§R1.6 стоп-лист (no LLM) + humanness-порог через порт |
| `persona.py` | forbidden_expressions (независимо от humanization) |
| `policy.py` | banned_words (critical) + max_length (независимо) |
| `engine.py` | `ValidationEngine.validate` → immutable `ValidationReport` |
| `observability.py` | локальные `MetricsHook`/`LoggingHook` (hooks, no-op) |
| `fakes.py` | `FakeDuplicationChecker`/`FakeHumannessScorer` — детерминированы |
| `services/validation.py` | composition + адаптер `OutputValidator` (Этап 12) + вплетение в AI-движок |

## 2. Соответствие 19 доп. требованиям владельца
1 Validation ⟂ (content/llm/providers/memory/rag) — **stdlib-only** ✅ · 2 каждое правило — Protocol ✅ ·
3 registry типизирован/расширяем/потокобезопасен/детерминирован ✅ · 4 Report/Finding/RuleContext frozen ✅ ·
5 Severity — модель, без строковых литералов ✅ · 6 pipeline модульный ✅ · 7 rewrite-decision — только
решение ✅ · 8 dedup — публичные Memory/RAG (порт), не Store ✅ · 9 Humanization — отдельный, без LLM ✅ ·
10 Persona независима ✅ · 11 Policy независим ✅ · 12 Quality Gates декларативны ✅ · 13 ML — только seam ✅ ·
14 metrics/logging — hooks ✅ · 15 runtime не имитируется (RV-13) ✅ · 16 фейки детерминированы ✅ ·
17 публичные контракты — §5 ниже ✅ · 18 матрица зависимостей — §6 ниже ✅ · 19 архитектурная проверка — §7 ниже ✅.

## 3. Верификация (offline)
| Проверка | Результат |
|---|---|
| `ruff` / `format` | All checks passed |
| `mypy --strict` | Success: 244 files, **0 `type: ignore`** |
| `pytest` | **291 passed, 6 skipped** (skipped = ранее-gated integration) |
| новых offline-тестов Этапа 14 | **22** (rules/engine/composition) |
| coverage подсистемы | **~99%** (большинство модулей 100%; deduplication 95%) |

## 4. Технический долг
Нет TODO/FIXME/`type: ignore`/`print`/`random`. Сообщения ASCII («cliche», без не-ASCII). Пороги/стоп-
листы — из `RuleContext`/config, не хардкод. Секретов в коде нет.

## 5. Публичные контракты Этапа 14 (Stable/Internal)
- **Protocol:** `Rule` (**Stable**) · `DuplicationChecker` (**Stable**) · `HumannessScorer` (**Stable**) ·
  `MetricsHook`/`LoggingHook` (**Stable**) · потребляемый `OutputValidator` (Этап 12, **Stable**);
  ML-validators = `Rule` (extension, **Stable**).
- **dataclass/DTO (immutable):** `Severity` (enum, **Stable**) · `Finding` (**Stable**) ·
  `ValidationReport` (**Stable**) · `RuleContext` (**Stable**) · `QualityGatePolicy` (**Stable**) ·
  `RewriteDecision` (enum, **Stable**) · `ValidationContextTemplate` (composition, **Internal**).
- **Registry:** `RuleRegistry` (**Stable**).
- **Классы-реализации:** `ValidationEngine`/`ValidationPipeline`/`DeduplicationRule`/`HumanizationRule`/
  `PersonaRule`/`PolicyRule` (**Stable**) · `FakeDuplicationChecker`/`FakeHumannessScorer` (**Internal**) ·
  `_OutputValidatorAdapter` (**Internal**).
- **Сервисные интерфейсы (`app/services/validation.py`):** `build_validation_engine`,
  `build_output_validator`, `build_ai_engine_with_validation`, `default_rule_registry` (**Stable**).
- **Точки расширения:** ML-валидаторы (как `Rule`) · реальный `HumannessScorer` (LLM-judge) · реальный
  `DuplicationChecker` (Memory/RAG) · пользовательские правила / quality-gate-конфиг · metrics/logging-импл.

## 6. Матрица зависимостей
- **Новые входящие (кто импортирует `app/validators`):** `app/services/validation.py`, `tests/validators/*`.
  **AI-движок (`app/content`) НЕ импортирует Validation.**
- **Новые исходящие (что импортирует `app/validators`):** **только stdlib** (подтверждено grep — ни
  одного `app.*`-импорта). НЕ импортирует `app/content`/`app/llm`/`app/core.providers`/`app/memory`/`app/rag`.
- **`app/services/validation.py` исходящие:** `app/validators`, `app/content` (адаптер `OutputValidator`/
  `ValidationResult`), `app/services/ai`, `app/core.config`. services→domain разрешено.
- **Циклы:** отсутствуют — `content`/`memory`/`rag`/`llm` не импортируют `validators`; `validators` ни от
  чего в `app` не зависит (grep подтверждает).
- **Layering guard:** `validators` = домен; запрещённые (`app.api`/`app.services`/`app.repositories`/
  `app.db`/`fastapi`) не импортируются → guard зелёный (`test_layering` passed).

## 7. Архитектурная проверка
- **Соответствие MASTER_SPEC:** §R5.5 (rule hard-gates; LLM-judge — порт), §R5.6 (rewrite-decision),
  §R5.7 (dedup-каскад), §R5.8/§R1.6 (humanization), §R5.9 (quality hard-gates). §R9 — dedup vector через
  публичные Memory/RAG (порт). §R3.1/§R3.8.
- **Соответствие §R5, §R9, §R3.1, §R3.8:** §R5 — validation-гейты (механизм (1) offline; (2) LLM-judge —
  порт/RV). §R9 — dedup через публичные интерфейсы. §R3.1 — домен; Validation не генерирует (req 8),
  видима только через `OutputValidator`; guard зелёный. §R3.8 — правила/гейты расширяемы регистрацией.
- **Влияние на AI Engine:** **нулевое** — движок Этапа 12 не изменён; видит только `OutputValidator`
  (раньше `AlwaysPass`, теперь реальный валидатор через ту же точку); адаптер — в composition.
- **Влияние на Memory/RAG:** **нулевое** — dedup через порт; изменений Memory/RAG нет.
- **Влияние на Provider Layer:** **нулевое** — LLM-judge/embedding — будущие порты; провайдер-слой не меняется.
- **Новые архитектурные риски:** (1) LLM-judge/vector-dedup — порты (RV-13); (2) ML-validators — seam;
  (3) корректность dedup-каскада — покрыта unit. Иных системных рисков нет.
- **Изменение Architecture Freeze:** **не требуется** — новые модули в существующем `app/validators`;
  паттерн «протоколы + фейки → реальные реализации позже». Новых ADR нет.

## 8. Проверка архитектурных инвариантов
- **AI Engine не зависит от реализации Validation Engine:** ✅ — `app/content` не импортирует `app/validators`
  (grep: NONE); движок видит только `OutputValidator`-Protocol Этапа 12.
- **Validation Engine не зависит от AI Engine:** ✅ — `app/validators` не импортирует `app/content` (и вообще
  ни один `app.*`; stdlib-only).
- **Memory и RAG используются только через публичные Protocol:** ✅ — dedup через порт `DuplicationChecker`;
  `app/validators` не импортирует `app/memory`/`app/rag`.
- **Отсутствуют новые циклические зависимости:** ✅ — `validators` — листовой (нет `app.*`-импортов);
  `content`/`memory`/`rag` не импортируют `validators`.
- **Layering guard остаётся зелёным:** ✅ — `tests/test_layering.py` passed.

## 9. Итог
Validation Engine реализован полностью и **offline**: независимая подсистема (stdlib-only), каждое правило —
Protocol, типизированный registry, декларативные quality-gates, immutable модели, rewrite-**decision** без
выполнения rewrite, dedup/humanness — через порты; AI-движок не изменён (видит только `OutputValidator`).
Долга нет. **LLM-judge/vector-dedup — RV-13.** Этап 15 (Image Engine) — по отдельной команде.
