# TASK_BREAKDOWN — Stage 14 (Validation Engine)

**Требует утверждения перед реализацией.** Цель (§R13.1 шаг 14, §R5.5–R5.9): **независимый Validation
Engine** — модульный validation-pipeline из декларативных правил (dedup / humanization / persona /
policy), типизированный rule-registry, модели Severity/Finding/(immutable) ValidationReport, quality-
gates и **Auto-Rewrite-Decision (только решение)**. AI-движок видит Validation **только через публичный
`OutputValidator` Protocol** (Этап 12). **Никакой генерации текста; никаких реальных LLM/embedding-
вызовов; ML-валидаторы — только точки расширения.** Architecture Freeze ACTIVE; SoT — MASTER_SPEC.

## Размещение (по §R3.1, owner req 1/2)

Доменный пакет **`app/validators/`** (§R3.1 домен; §R13.1 шаг 14). **Полностью независим от AI-движка**:
не импортирует `app/content`. AI-движок видит Validation **только** через `OutputValidator` (Этап 12) —
адаптер `ValidationReport → ValidationResult` живёт в **composition** (`app/services/validation.py`), не
в движке и не в валидаторах. Dedup/humanness используют **порты** (`DuplicationChecker`/`HumannessScorer`),
реальные реализации (через публичные интерфейсы Memory/RAG и LLM-judge) — в composition/позже. Так
`app/validators` не зависит от Memory/RAG/Provider (максимальная независимость).

---

## ⚠️ Ограничение среды (нет реальных LLM/embedding)

По требованию — не имитировать runtime. **Три статуса:**
- **Implemented / Statically Verified (offline):** rule-engine/registry/pipeline, модели Severity/
  Finding/Report, dedup (trigram/sentence — **чистый текст**), humanization (стоп-лист — чистый),
  persona/policy (чистые), quality-gates, rewrite-decision, hooks, фейки чекеров/скореров.
  Покрытие ~100%.
- **Runtime Verification Pending (RV-13):** реальный **LLM-judge** (humanness §R5.8) и **vector-стадия
  dedup** (§R5.7, через Memory/RAG + embeddings) под живыми LLM/embedding-API. Интеграционные тесты —
  пишутся, **пропускаются** без сервисов.

## Особые требования владельца (1–21)
1 Validation ⟂ AI Engine · 2 AI Engine видит только `OutputValidator` Protocol · 3 pipeline модульный ·
4 каждое правило — Protocol · 5 registry типизирован/расширяем · 6 ValidationResult immutable · 7 Severity
отдельной моделью · 8 Validation не генерирует текст · 9 Auto-Rewrite-Decision — только решение · 10 dedup
только через публичные Memory/RAG-интерфейсы · 11 Humanization — отдельный модуль · 12 Persona — отдельный
модуль · 13 Policy — отдельный модуль · 14 Quality Gates декларативны · 15 ML-validators — точки
расширения (без реализации) · 16 metrics/logging — hooks · 17 без реальных LLM-вызовов · 18 без реальных
embedding-вызовов · 19 фейк-валидаторы детерминированы · 20 публичные интерфейсы — Protocol · 21 три статуса.

---

## Последовательность задач

### T14.0 — Зависимости + gate
- **Новых зависимостей нет** (чистый текст + фейки). LLM/embedding — только через порты (не вызываются).
- **Критерий:** нет новых пакетов; в коде Этапа 14 нет LLM/embedding-вызовов (grep); при нужде — СТОП+отчёт.

### T14.1 — Severity + Finding + ValidationReport (immutable, req 6/7)
- `app/validators/models.py` — `Severity` (StrEnum: info/warning/error/critical); `Finding`
  (frozen: rule, severity, message, span?); `ValidationReport` (frozen: findings, passed, gate-итог).
- **Критерий:** immutable; типизированы; `passed` выводится из hard-gate-findings; unit.

### T14.2 — Rule Protocol + RuleContext (req 4)
- `app/validators/rules.py` — `Rule` Protocol (`async def check(ctx: RuleContext) -> list[Finding]` или
  sync — детерминированно); `RuleContext` (frozen: text + persona-данные + policy-данные (banned_words/
  allowed_topics/max_len/thresholds) + порты `DuplicationChecker`/`HumannessScorer`). **Данные, не движок.**
- **Критерий:** правило — через Protocol; контекст immutable; unit.

### T14.3 — Rule Registry (req 5)
- `app/validators/registry.py` — типизированный, потокобезопасный, расширяемый `RuleRegistry`
  (register/get/all по имени/категории); unknown → чистая ошибка (не падение).
- **Критерий:** типизирован; расширяем; unknown обработан; unit.

### T14.4 — Validation Pipeline (req 3, модульный)
- `app/validators/pipeline.py` — `ValidationPipeline`: прогоняет правила из registry по `RuleContext`,
  собирает `Finding`, применяет quality-gates → `ValidationReport`. Добавление правила — без правки ядра.
- **Критерий:** модульно/расширяемо; порядок детерминирован; unit на прогоне.

### T14.5 — Deduplication validation (§R5.7, req 10)
- `app/validators/deduplication.py` — каскад дёшево→дорого: (1) **trigram Jaccard** (чистый текст),
  (2) предложения/абзацы overlap (чистый), (3) **vector-стадия — через порт `DuplicationChecker`**
  (реальный — Memory/RAG публичные интерфейсы, RV-13). Порог — `similarity_threshold`.
- **Критерий:** (1)(2) offline/детерминированы; (3) через порт (фейк offline); unit.

### T14.6 — Humanization validation (§R5.8/§R1.6, req 11)
- `app/validators/humanization.py` — **отдельный модуль**: стоп-лист AI-фраз/клише (gate, чистый) +
  humanness-порог `HUMANNESS_MIN` через порт `HumannessScorer` (реальный LLM-judge — RV-13).
- **Критерий:** стоп-лист offline; humanness через порт (фейк); unit.

### T14.7 — Persona validation (req 12) — отдельный модуль
- `app/validators/persona.py` — проверки соответствия персоне (forbidden_expressions присутствуют → fail;
  favorite_words/manner — из данных `RuleContext`). Чистый/детерминированный.
- **Критерий:** persona-правила offline; unit.

### T14.8 — Policy validation (§R5.9, req 13) — отдельный модуль
- `app/validators/policy.py` — контент-политика: `banned_words` (gate), `allowed_topics`,
  `max_post_length`, язык/длина. Из данных `RuleContext`. Чистый.
- **Критерий:** policy-правила offline; unit (запрещённое слово → finding).

### T14.9 — Quality Gates (§R5.9, req 14) — декларативно
- `app/validators/gates.py` — декларативная конфигурация: какие правила — **hard gates** (блокируют,
  §R5.9) vs soft (warning). `QualityGate` (frozen). `passed` = нет hard-findings (severity ≥ error).
- **Критерий:** декларативно; hard vs soft; unit (hard блокирует, soft — нет).

### T14.10 — Auto Rewrite Decision Layer (§R5.6, req 9)
- `app/validators/decision.py` — `RewriteDecision` (accept/rewrite/needs_review) из findings/severity.
  **Только решение; rewrite НЕ выполняет** (его крутит AI-движок §R5.6). Данные для `OutputValidator`.
- **Критерий:** решение по findings; движок не вызывается; unit.

### T14.11 — ML-validator integration point (req 15) — seam
- Документированная точка расширения: ML-валидатор = обычное `Rule` (Protocol) + возможный `MLValidator`
  маркер-порт. **Не реализуется** (нет модели/вызовов).
- **Критерий:** seam типизирован; ни одной ML-реализации; unit (место расширения существует).

### T14.12 — Metrics/Logging hooks (req 16)
- `app/validators/observability.py` — `ValidationObservability` (reuse `workers` metrics/log); события:
  правил запущено/finding'ов/gate-итог. **Только hooks**, no-op по умолчанию.
- **Критерий:** hooks; no-op default; unit.

### T14.13 — Fakes (детерминированы, req 19)
- `app/validators/fakes.py` — `FakeDuplicationChecker` (детерминированный «дубль/не дубль»),
  `FakeHumannessScorer` (детерминированный балл), опц. `FakeRule`. **Полностью offline.**
- **Критерий:** детерминизм (без random/времени/LLM/embedding); реализуют порты; unit.

### T14.14 — Validation Engine (оркестратор) + порт-адаптер
- `app/validators/engine.py` — `ValidationEngine.validate(text, ctx) -> ValidationReport` (registry+
  pipeline+gates+decision). **Не генерирует, не вызывает LLM/embedding.**
- Адаптер `ValidationReport → ValidationResult` (Этап 12) — в composition (не в движке/валидаторах).
- **Критерий:** отчёт из правил; типы; unit end-to-end на фейках.

### T14.15 — Composition + DI (`app/services/validation.py`)
- `build_validation_engine(settings, *, checker=None, scorer=None)`; `build_output_validator(...)` →
  объект, удовлетворяющий `OutputValidator` (адаптер); `build_ai_engine_with_validation(...)` — вплетает
  валидатор в `build_ai_engine(validators=[...])` (Этап 12 **не меняется**). Реальный `DuplicationChecker`
  — через **публичные** Memory/RAG-интерфейсы (§R5.7); реальный `HumannessScorer` — LLM-judge (позже/RV).
- **Критерий:** движок валидации собран offline; адаптер — `OutputValidator`; AI-движок с валидацией
  работает offline; unit + интеграция.

### T14.16 — Tests (offline)
- `tests/validators/*` — models, rules/context, registry, pipeline, dedup(trigram/sentence/port),
  humanization(стоп-лист/port), persona, policy, gates, decision, observability, fakes, engine.
- `tests/services/test_validation.py` — composition + адаптер `OutputValidator` + интеграция с AI-движком
  (валидатор реально гейтит/пропускает; rewrite решает движок).
- **Integration (за `RUN_INTEGRATION=1`+LLM/embeddings, не запускается):** LLM-judge, vector-dedup — **RV-13**.
- **Критерий:** offline зелёные ~100%; `mypy --strict` без `type: ignore`; guard зелёный; интеграционные skip.

### T14.17 — Reports + закрытие
- `STAGE14_REPORT.md` (+«Публичные контракты» Stable/Internal, +«Архитектурная проверка»),
  `CODE_AUDIT_STAGE14.md`, `RELEASE_NOTES_STAGE14.md`; обновить `TECHNICAL_BACKLOG.md` (RV-13 LLM-judge/
  vector-dedup; ML-validators — расширение), `TRACEABILITY_STAGE2.md` (§R5.5–R5.9, §R1.6, §R9 — три
  статуса). README — секция Validation. Серия коммитов + тег `stage-14-validation`.
- **Критерий:** ruff/mypy-strict/pytest зелёные (offline); секреты не в git; тег на финале.

---

## Создаваемые/изменяемые файлы

| Файл | Действие |
|---|---|
| `app/validators/{models,rules,registry,pipeline,deduplication,humanization,persona,policy,gates,decision,observability,fakes,engine}.py` | новые — Validation Engine |
| `app/validators/__init__.py` | обновить (экспорт) |
| `app/services/validation.py` | новый — composition + `OutputValidator` адаптер + интеграция в AI-движок |
| `tests/validators/*`, `tests/services/test_validation.py` | новые — offline |
| `README.md` | edit — секция Validation |
| `STAGE14_REPORT.md`, `CODE_AUDIT_STAGE14.md`, `RELEASE_NOTES_STAGE14.md` | новые |
| `TECHNICAL_BACKLOG.md`, `TRACEABILITY_STAGE2.md` | обновление (живые) |

## Новые зависимости
**Нет.** Правила — чистый текст/эвристики; LLM-judge и vector-dedup — через порты (не вызываются offline).

## Реализуемые требования MASTER_SPEC
§R5.5 (self-review = rule hard-gates + LLM-judge-порт) · §R5.6 (rewrite-**decision**, не выполнение) ·
§R5.7 (duplicate cascade trigram→sentence→vector-порт) · §R5.8/§R1.6 (humanization стоп-лист + humanness-
порог) · §R5.9 (quality hard-gates блокируют) · §R9 (dedup vector — публичные Memory/RAG) · §R3.1 (домен;
Validation не генерирует, видима только через Protocol) · §R3.8 (правила/гейты расширяемы регистрацией).

## Риски

| # | Риск | Уровень | Митигация |
|---|---|---|---|
| R1 | LLM-judge/vector-dedup не проверяются offline | 🟠 | порты + фейки offline; реальные — RV-13 |
| R2 | ML-validators — только seam | 🟡 | `Rule` Protocol как точка расширения; без реализации |
| R3 | Независимость Validation ⟂ AI Engine | 🟢 | `app/validators` не импортирует `app/content`; связь — `OutputValidator` в composition |
| R4 | dedup должен использовать только публичные Memory/RAG | 🟢 | порт `DuplicationChecker`; реальный — в composition через публичные интерфейсы |
| R5 | Декларативность quality-gates | 🟢 | конфиг hard/soft; движок не хардкодит |
| R6 | Rewrite-петля vs decision | 🟢 | Validation — только решение; rewrite крутит AI-движок (§R5.6) |
| R7 | Пороги/стоп-листы как «магия» | 🟢 | из `RuleContext`/config (§Appendix B), не хардкод |

---

## Публичные контракты Этапа 14 (Stable/Internal)

- **Protocol:** `Rule` (**Stable**) · `DuplicationChecker` (**Stable**) · `HumannessScorer` (**Stable**) ·
  `MLValidator`-seam (**Stable**, extension) · `MetricsHook`/`LoggingHook` (reuse, **Stable**) ·
  потребляемый `OutputValidator` (Этап 12, **Stable**).
- **dataclass / DTO (immutable):** `Severity` (enum, **Stable**) · `Finding` (**Stable**) ·
  `ValidationReport` (**Stable**) · `RuleContext` (**Stable**) · `QualityGate` (**Stable**) ·
  `RewriteDecision` (**Stable**).
- **Registry:** `RuleRegistry` (**Stable**).
- **Классы-реализации:** `ValidationEngine`/`ValidationPipeline`/правила dedup/humanization/persona/policy/
  gates/decision (**Stable**) · `FakeDuplicationChecker`/`FakeHumannessScorer`/`FakeRule` (**Internal**).
- **Сервисные интерфейсы (`app/services/validation.py`):** `build_validation_engine`,
  `build_output_validator`, `build_ai_engine_with_validation` (**Stable**).
- **Точки расширения:** ML-валидаторы (как `Rule`) · реальный `HumannessScorer` (LLM-judge) · реальный
  `DuplicationChecker` (Memory/RAG) · пользовательские правила/quality-gate-конфиг · metrics/logging-импл.

## Матрица зависимостей

- **Новые входящие (кто импортирует `app/validators`):** `app/services/validation.py` (composition),
  `tests/validators/*`. **AI-движок (`app/content`) НЕ импортирует Validation** (видит только `OutputValidator`).
- **Новые исходящие (что импортирует `app/validators`):** `app/workers` (observability-hooks reuse),
  stdlib. **НЕ импортирует** `app/content` / `app/memory` / `app/rag` / `app/core.providers` (независимость;
  Memory/RAG/LLM — только через порты, реализуемые в composition).
- **`app/services/validation.py` исходящие:** `app/validators`, `app/content` (адаптер `OutputValidator`/
  `ValidationResult`), `app/memory`+`app/rag` (реальный `DuplicationChecker` через публичные интерфейсы),
  `app/services/ai` (вплетение в движок). services→domain разрешено.
- **Циклы:** отсутствуют — `validators` ⊄ `content`/`memory`/`rag`; `content`/`memory`/`rag` ⊄ `validators`.
- **Layering guard:** `validators` = домен; запрещённые (`app.api`/`app.services`/`app.repositories`/
  `app.db`/`fastapi`) не импортируются → guard зелёный.

## Архитектурная проверка (план)

- **Соответствие MASTER_SPEC:** реализуются §R5.5 (rule hard-gates; LLM-judge — порт), §R5.6 (rewrite-
  decision), §R5.7 (dedup-каскад), §R5.8/§R1.6 (humanization), §R5.9 (quality hard-gates). §R9 — dedup
  vector через **публичные** Memory/RAG. §R3.1/§R3.8.
- **Соответствие §R5, §R9, §R3.1, §R3.8:** §R5 — validation-гейты (self-review механизм (1); механизм (2)
  LLM-judge — порт/RV). §R9 — dedup использует публичные Memory/RAG-интерфейсы. §R3.1 — домен; Validation
  не генерирует (req 8), видима только через Protocol (req 2); guard зелёный. §R3.8 — правила/гейты
  расширяемы регистрацией без правки ядра.
- **Влияние на AI Engine:** **нулевое** — движок Этапа 12 не изменён; видит только `OutputValidator`;
  адаптер — в composition. (Раньше был `AlwaysPass`; теперь — реальный валидатор через ту же точку.)
- **Влияние на Memory/RAG:** **нулевое** — dedup потребляет публичные интерфейсы через порт; изменений
  Memory/RAG нет.
- **Влияние на Provider Layer:** **нулевое** — LLM-judge/embedding — будущие порты; провайдер-слой не меняется.
- **Изменение Architecture Freeze:** **не требуется** — новые модули в существующем `app/validators`;
  паттерн «протоколы + фейки → реальные реализации позже». Новых ADR нет.
- **Потенциальные архитектурные риски:** (1) LLM-judge/vector-dedup — порты (RV-13); (2) ML-validators —
  seam; (3) корректность dedup-каскада — покрыта unit на чистых стадиях. Иных системных рисков нет.

---

> **Стоп для утверждения.** К реализации Этапа 14 приступаю только после подтверждения плана. Без
> утверждения Этап 14 не начинаю.
