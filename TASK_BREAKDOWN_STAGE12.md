# TASK_BREAKDOWN — Stage 12 (AI Engine)

**Требует утверждения перед реализацией.** Цель (§R13.1 шаг 12): **provider-agnostic AI-движок
генерации текста** — модульный prompt-pipeline, динамический context-builder, независимые
provider/model selection, structured-output слой, quality-rewrite/fallback-поток, token-budget и
точки интеграции (streaming/cost/metrics/logging). **Использует только Provider Protocols Этапа 11;
никаких конкретных вызовов OpenAI/Anthropic. Никакой бизнес-логики (правила персоны/самопроверки/
дедуп/бандит — §R5.4–R5.11 — вне объёма, приходят на этапах 14/17 через seam'ы).** Architecture
Freeze ACTIVE; MASTER_SPEC — SoT.

## Размещение (по §R3.1)

Движок — **доменный** пакет **`app/content/`** (§R3.1: домен = «доменная логика и адаптеры
провайдеров»; §R13.1 шаг 12 наполняет `app/content`). Домен **не открывает сессию БД, не знает HTTP**;
использует `app/llm` (LLMProvider Этапа 11) и `app/core/providers` (factory/errors/resilience/
observability). **Context-порты** (Memory/Knowledge) объявляются здесь как интерфейсы + фейки;
реальные Memory/RAG-адаптеры — Этап 13 (dependency inversion, как провайдеры на Этапе 11).
Composition — `app/services/ai.py`. Слои: `services → app/content (домен) → app/llm/app/core/providers`.

---

## ⚠️ Ограничение среды (нет реальных LLM)

По требованию — не имитировать runtime. **Три статуса:**
- **Implemented / Statically Verified (offline):** движок целиком offline на `FakeLLMProvider`
  (Этап 11) + фейковых context-источниках — pipeline, context-builder, шаблоны, selection (provider/
  model), token-budget, structured-output, validation-seam, rewrite/fallback-поток, streaming/cost/
  metrics/logging hooks. Покрытие ~100% (чистая оркестрация + фейки).
- **Runtime Verification Pending (RV-11):** генерация против **живых** LLM (Anthropic/OpenAI) —
  фактический роутинг/fallback/streaming/стоимость/латентность под реальными моделями. Наследует
  RV-10 (реальные адаптеры); интеграционные тесты пишутся и **пропускаются** без ключей/сети.

## Особые требования владельца (1–13)
1 движок независим от конкретных LLM ✅-цель · 2 только Provider Protocols (Этап 11) · 3 prompt-pipeline
модульный · 4 prompt-builder не знает моделей · 5 provider selection ≠ model selection (независимы) ·
6 structured output — отдельный слой · 7 контекст через Memory/Knowledge интерфейсы · 8 без конкретных
API-вызовов (только Protocol) · 9 streaming — только точки интеграции · 10 cost — только точки
интеграции (без биллинга) · 11 без бизнес-логики в движке · 12 runtime не имитировать · 13 три статуса.

## Ключевые развязки
- **Rewrite (§R5.6, `MAX_REWRITES=3`) ≠ infra retry (`MAX_RETRIES=5`, Executor Этапа 8).** Движок
  крутит **quality-rewrite** по результату validation-seam; инфраструктурные ретраи остаются у Executor.
- **Fallback (§R2.9/R5.10):** движок пробует model-tier (primary→fallback); исчерпание → доменная
  ошибка (`GenerationExhausted`) — reschedule/notify выполняет очередь/нотификации (не движок).
- **Context (§R5.2):** «окно 500» (`HISTORY_WINDOW`) — векторное сравнение, **в промпт не попадает**
  (это дедуп — Этап 14); в промпт — **few-shot K=3–5** через Memory/Knowledge порты; сборщик
  соблюдает `MAX_CONTEXT_TOKENS`.
- **Model routing (§R5.10):** тело/продающее → `claude-opus-4-8`; заголовок/CTA/тема/judge →
  `claude-haiku-4-5` — таблица данных (не бизнес-логика).

---

## Последовательность задач

### T12.0 — Зависимости + gate
- **Новых зависимостей нет.** Token-оценка — эвристика (без токенайзер-зависимости); реальный
  токенайзер — позже через `TokenEstimator` seam. Проверить, что `FakeLLMProvider`/`json_mode`
  Этапа 11 достаточны для offline.
- **Критерий:** нет новых пакетов; конкретные вендорские SDK не импортируются; при нужде — СТОП+отчёт.

### T12.1 — Engine Architecture (контракты)
- `app/content/types.py` — `PromptSpec` (персона/стиль/тема/constraints/few-shot — **как данные**,
  не правила), `GenerationRequest`, `GenerationResult`, `Role` (body/title/cta/theme/judge).
- `app/content/engine.py` — `AIEngine.generate(request) -> GenerationResult`: связывает pipeline,
  selection, structured-output, rewrite/fallback, hooks. **Только оркестрация.**
- **Критерий:** контракты типизированы; движок собирается из инъектируемых частей; mypy strict.

### T12.2 — Prompt Pipeline (модульный)
- `app/content/pipeline.py` — упорядоченные **шаги** (декларативно, как данные): context → render →
  select → generate → parse → validate → decide. Каждый шаг — 1 ответственность; расширяемо без
  правки движка (§R3.8).
- **Критерий:** шаги композируются; добавление шага не меняет ядро; unit на прогоне pipeline (fakes).

### T12.3 — Prompt Templates
- `app/content/templates.py` — реестр шаблонов по `PromptType` (§models.enums) + рендер из частей
  (persona + style + topic + few-shot + constraints, §R5.3). **Статический универсальный промпт
  запрещён; шаблоны не знают моделей** (req 4).
- **Критерий:** динамическая сборка из частей; нет модель-специфики; unit на рендере/подстановке.

### T12.4 — Prompt Context Builder + Token Budgeting / Context Window (§R5.2, §R9.8)
- `app/content/context.py` — собирает few-shot (K=3–5) из context-портов + `persona.best_examples`;
  **соблюдает `MAX_CONTEXT_TOKENS`** (usage from settings).
- `app/content/budget.py` — `TokenEstimator` (эвристика, pluggable) + бюджетирование/усечение
  контекста под окно; «окно 500» **не** в промпте (дедуп — Этап 14).
- **Критерий:** контекст ≤ бюджета; детерминированное усечение; unit на границах бюджета.

### T12.5 — Context Ports (Memory / Knowledge) + Fakes
- `app/content/sources.py` — порты `MemoryContextSource`/`KnowledgeContextSource` (Protocol) +
  детерминированные фейки (пустые/фиксированные примеры). Реальные Memory/RAG — Этап 13.
- **Критерий:** порты типизированы; фейки offline/детерминированы; unit.

### T12.6 — Provider Selection (независимый механизм)
- `app/content/selection.py` (часть) — `ProviderSelector`: выбирает LLM-провайдера через **factory
  Этапа 11** (§R2.10). **Не** знает про модели.
- **Критерий:** выбор провайдера независим от модели; фейк-провайдер offline; unit.

### T12.7 — Model Selection / Routing (независимый механизм, §R5.10)
- `app/content/selection.py` (часть) — `ModelRouter`: `Role → model_id` (тело=`claude-opus-4-8`;
  title/cta/theme/judge=`claude-haiku-4-5`) — **таблица данных**, независима от provider selection
  (req 5).
- **Критерий:** роутинг по роли; независим от провайдера; unit на таблице.

### T12.8 — Structured Output Pipeline (отдельный слой, req 6)
- `app/content/structured.py` — `StructuredOutputParser[T]`: запрос `json_mode` (capability Этапа 11)
  + парс/валидация в Pydantic-схему; ошибка парса → сигнал в rewrite. **Отдельный слой** над сырым
  текстом.
- **Критерий:** валидный JSON → типизированный объект; невалидный → чёткая ошибка; unit.

### T12.9 — Validation Layer (seam, §R5.5)
- `app/content/validation.py` — `OutputValidator` Protocol + `ValidationResult(passed, issues)` +
  дефолт `AlwaysPass`. **Конкретные гейты (грамматика/человечность/уникальность §R5.5–R5.9) — Этап 14**,
  подключаются сюда без изменения движка.
- **Критерий:** seam типизирован; дефолт пропускает; unit (pass/fail управляет rewrite).

### T12.10 — Retry Flow (quality rewrite, §R5.6)
- `app/content/rewrite.py` — цикл до `MAX_REWRITES` (settings): generate→validate→(rewrite при fail);
  best-of-N с гейтом (минимально). **≠ infra `MAX_RETRIES`** (Executor).
- **Критерий:** останавливается по прохождению/исчерпанию; детерминизм на фейках; unit.

### T12.11 — Fallback Strategy (§R2.9/R5.10)
- `app/content/fallback.py` — model-tiers (primary→fallback); на `TemporaryProviderError`/сбое —
  следующий tier; исчерпание → `GenerationExhausted` (доменная ошибка → очередь reschedule/notify).
- **Критерий:** переход по tier'ам; исчерпание → доменная ошибка; unit (primary fail → fallback ok).

### T12.12 — Streaming integration points (req 9, без реализации)
- `app/content/streaming.py` — `StreamSink` Protocol + no-op дефолт (точка интеграции; фактического
  стриминга нет).
- **Критерий:** seam типизирован; дефолт no-op; unit (hook вызывается в точке).

### T12.13 — Cost / Metrics / Logging hooks (req 10, §R5.12)
- `app/content/cost.py` — `CostSink` hook (usage: prompt/completion tokens, model) без биллинга;
  дефолт no-op; запись в `api_usage` — позже (§R5.12). Metrics/Logging — reuse `app/core/providers/
  observability` + `workers`.
- **Критерий:** hooks типизированы; no-op по умолчанию; unit (cost-hook получает usage).

### T12.14 — Composition + DI
- `app/services/ai.py` — `build_ai_engine(settings, *, provider_factory=None, ...)`: собирает движок с
  фейковыми источниками/дефолтными seam'ами; использует factory Этапа 11. (Опционально — тонкий
  `generate_text` handler-seam, только вызов движка, без правил.)
- **Критерий:** движок собирается offline; переопределяемо; unit + (при наличии) DI-тест.

### T12.15 — Tests (offline)
- `tests/content/*` — pipeline, templates, context+budget, sources-fakes, provider/model selection,
  structured-output, validation-seam, rewrite (MAX_REWRITES), fallback (tiers/exhaustion), streaming/
  cost hooks, engine end-to-end на `FakeLLMProvider`. `tests/services/test_ai.py` — composition.
- **Integration (за `RUN_INTEGRATION=1`+ключи, не запускается):** генерация против живых LLM — **RV-11**.
- **Критерий:** offline зелёные ~100%; `mypy --strict` без `type: ignore`; интеграционные skip.

### T12.16 — Reports + закрытие
- `STAGE12_REPORT.md` (+«Архитектурная проверка»), `CODE_AUDIT_STAGE12.md`, `RELEASE_NOTES_STAGE12.md`;
  обновить `TECHNICAL_BACKLOG.md` (RV-11 AI-engine-runtime; заметки по §R5.5/R5.7/R5.11 — Этап 14/17),
  `TRACEABILITY_STAGE2.md` (§R5.1/2/3/6/10/12, §R2.9/R2.10, §R9.8 — три статуса). README — секция AI
  Engine. Серия коммитов + тег `stage-12-ai-engine`.
- **Критерий:** ruff/mypy-strict/pytest зелёные (offline); секреты не в git; тег на финале.

---

## Создаваемые/изменяемые файлы

| Файл | Действие |
|---|---|
| `app/content/{types,engine,pipeline,templates,context,budget,sources,selection,structured,validation,rewrite,fallback,streaming,cost}.py` | новые — AI-движок (оркестрация + seam'ы) |
| `app/content/fakes.py` | новый — фейковые context-источники (offline) |
| `app/services/ai.py` | новый — composition `build_ai_engine` |
| `app/api/deps.py` | edit — (опц.) `get_ai_engine` DI-seam |
| `tests/content/*`, `tests/services/test_ai.py` | новые — offline |
| `README.md` | edit — секция AI Engine |
| `STAGE12_REPORT.md`, `CODE_AUDIT_STAGE12.md`, `RELEASE_NOTES_STAGE12.md` | новые |
| `TECHNICAL_BACKLOG.md`, `TRACEABILITY_STAGE2.md` | обновление (живые) |

## Новые зависимости
**Нет.** Token-оценка — эвристика (pluggable `TokenEstimator`); реальный токенайзер/вендорские SDK —
адаптерные этапы. Structured output — Pydantic v2 (уже в манифесте).

## Реализуемые требования MASTER_SPEC
§R5.1 (стадии generate_text — оркестрация) · §R5.2 (context/few-shot/`MAX_CONTEXT_TOKENS`) · §R5.3
(динамический prompt-builder) · §R5.6 (rewrite `MAX_REWRITES` ≠ retry) · §R5.10 (model routing opus/
haiku + fallback) · §R5.12 (cost — hook) · §R2.9 (fallback-каскад) · §R2.10 (только Provider Protocols) ·
§R9.8 (context assembly ≤ токен-бюджета) · §R3.1 (движок в домене, без БД/HTTP/бизнес-правил) · §R3.8
(pluggable шаги/валидаторы/источники/шаблоны).

## Риски

| # | Риск | Уровень | Митигация |
|---|---|---|---|
| R1 | Нет живых LLM → генерация не проверяется под реальными моделями | 🟠 | offline на `FakeLLMProvider` ~100%; реальные модели — RV-11 (наследует RV-10) |
| R2 | «Расползание» бизнес-логики (self-review/persona/дедуп) в движок | 🟡 | правила — inputs/seam'ы; §R5.4–R5.11 реализуются на этапах 14/17; движок только оркестрирует |
| R3 | Token-оценка без реального токенайзера | 🟡 | эвристика + `TokenEstimator` seam; реальный токенайзер позже; бюджет консервативен |
| R4 | Memory/Knowledge порты определяются до Этапа 13 | 🟢 | dependency inversion: порты+фейки сейчас, реальные адаптеры — Этап 13 (как провайдеры на 11) |
| R5 | Связывание provider- и model-selection | 🟢 | два независимых механизма (req 5); раздельные тесты |
| R6 | Structured-output парс-ошибки | 🟡 | отдельный слой; ошибка → rewrite; схема-валидация Pydantic |
| R7 | Путаница rewrite (quality) vs infra retry vs fallback | 🟢 | разведены: rewrite=`MAX_REWRITES`, retry=Executor, fallback=model-tier; документировано |

---

## Архитектурная проверка (план)

- **Соответствие MASTER_SPEC:** реализуются §R5.1/2/3/6/10/12, §R2.9, §R9.8 (оркестрация генерации);
  §R5.4–R5.11 (правила/самопроверка/дедуп/бандит) намеренно отложены на этапы 14/17 — соответствие
  плану §R13.1 (Validation ДО движков не нарушается: движок предоставляет validation-**seam**, гейты —
  Этап 14). Контекст — §R5.2/R9.8.
- **Соответствие §R2.10, §R3.1, §R3.8:** §R2.10 — движок использует только Provider Protocols Этапа 11
  (никаких вендорских вызовов). §R3.1 — движок в доменном `app/content`, без БД/HTTP/бизнес-правил;
  composition в services; guard слоёв зелёный. §R3.8 — pipeline-шаги/валидаторы/источники/шаблоны/
  model-роутинг расширяемы регистрацией/инъекцией без правки ядра.
- **Влияние на Architecture Freeze:** **не требуется изменение.** Новые модули — в существующем
  доменном пакете `app/content`; порты Memory/Knowledge — тот же паттерн, что провайдеры на Этапе 11
  (protocols + fakes → реальные адаптеры позже). Новых ADR нет.
- **Потенциальные архитектурные риски:** (1) бизнес-логика в движке — митигируется правилом «движок =
  оркестрация, правила = seam/inputs»; (2) преждевременная связка с Memory/RAG — митигируется портами+
  фейками (реализация Этап 13); (3) provider/model связывание — раздельные механизмы. Иных системных
  рисков не предвидится.

---

> **Стоп для утверждения.** К реализации Этапа 12 приступаю только после подтверждения плана. Без
> утверждения Этап 12 не начинаю.
