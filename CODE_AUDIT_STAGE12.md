# CODE_AUDIT_STAGE12.md — Аудит качества кода Этапа 12 (AI Engine)

**Область:** `app/content/*`, `app/services/ai.py`, `tests/content/*`, `tests/services/test_ai.py`.
**Дата:** 2026-07-25. **Метод:** self-review + ruff/mypy/pytest/coverage. **Ограничение:** реальные
LLM не вызывались.

---

## 1. Слои / архитектура (§R3.1)
- Движок в доменном `app/content`: **без БД-сессии, без HTTP, без бизнес-правил**. `test_layering`
  зелёный. Использует `app/llm` (LLMProvider) и `app/core/providers` (factory/errors/observability) —
  domain→domain/core (разрешено). Composition — в services; никаких `app.api`/`fastapi`/`sqlalchemy`.
- Context — **только через порты** (`MemoryContextSource`/`KnowledgeContextSource`), прямого доступа к
  БД нет (owner req 6).

## 2. Соответствие особым требованиям владельца (1–15)
| # | Требование | Статус |
|---|---|---|
| 1 | движок = оркестратор без правил | ✅ (persona/style — data; гейты — seam) |
| 2 | каждый этап — модуль, расширяемо | ✅ (contributors/validators; тест extensibility) |
| 3 | prompt-builder без моделей (структура) | ✅ (`PromptBuilder`+`templates`) |
| 4 | provider selection — только провайдер | ✅ (`ProviderSelector`) |
| 5 | model selection независим, декларативно | ✅ (`ModelRouter` role→tiers; тест независимости) |
| 6 | контекст через порты, без БД | ✅ (`ContextBuilder` на портах) |
| 7 | token-budget детерминирован, только `TokenEstimator` | ✅ (эвристика; тесты) |
| 8 | structured output — отдельный слой | ✅ (`structured.py`; не в builder) |
| 9 | validation расширяем | ✅ (`OutputValidator` seam) |
| 10 | rewrite ≠ retry | ✅ (`RewritePolicy`; не `workers.retry`) |
| 11 | fallback только в движке; очередь не выбирает модель | ✅ (`generate_with_fallback`) |
| 12 | streaming — только seam | ✅ (`StreamSink` no-op) |
| 13 | cost — только hooks | ✅ (`CostSink` no-op/recording) |
| 14 | logging/metrics — инфра-hooks | ✅ (reuse observability) |
| 15 | runtime не имитируется, три статуса | ✅ (RV-11) |

## 3. Типизация / стиль
- `mypy --strict` — **0 ошибок (202 файла), 0 `type: ignore`**. `ruff` — All checks passed.
- PEP 695 дженерики (`StructuredOutputParser[SchemaT: BaseModel]`); протоколы структурные — фейки/моки
  удовлетворяют без наследования; `cast` в selection (не `type: ignore`).
- `Role.headline` (не `title`) — избегает затенения `str.title` на StrEnum (поймано mypy).

## 4. Корректность (ключевые точки)
- **Provider vs model независимость:** `ModelRouter` не требует factory/провайдера (тест доказывает);
  `ProviderSelector` не знает моделей.
- **Fallback (§R2.9):** temporary → следующий tier; permanent → немедленный проброс (auth/bad-request);
  исчерпание → `GenerationExhausted` (transient) → очередь reschedule. Покрыто по всем ветвям.
- **Rewrite ≠ retry:** цикл по `MAX_REWRITES`, останов по прохождению/исчерпанию; при исчерпании —
  `passed=False` (needs_review решает caller), **не** исключение. Не использует `workers.retry`.
- **Structured как seam:** parse-ошибка → `ValidationResult(passed=False)` → rewrite; отдельный слой.
- **Budget детерминизм:** эвристика ceil(len/4); `fit_within` — порядок сохранён, усечение по остатку.
- **Context ports:** few-shot из spec.examples + порты, cap K, бюджет с учётом reserved.

## 5. Тесты / покрытие
- **34 offline-теста** (prompt/pipeline, budget+context, selection, structured/validation/rewrite,
  fallback, engine end-to-end, hooks, composition). RV-тестов нет (Этап 12 offline).
- coverage подсистемы **~99%**: engine/budget/context/selection/structured/rewrite/fallback/types/
  cost/streaming/validation 100%; pipeline 97%, fakes 90% (неиспользуемая ветвь FixedKnowledge) —
  тривиально, логических пробелов нет.

## 6. Наблюдения / риски
| # | Наблюдение | Severity | Примечание |
|---|---|---|---|
| A | Реальные LLM не вызывались | 🟢 | по замыслу; RV-11 |
| B | Правила качества (§R5.5–R5.11) не в движке | 🟢 | по требованию; seam/inputs; этапы 14/17 |
| C | Token-оценка — эвристика | 🟡 | `TokenEstimator` seam; реальный токенайзер позже; консервативно |
| D | Memory/Knowledge — фейки | 🟢 | реальные адаптеры — Этап 13 (порты готовы) |
| E | `TimeoutError`-подобных имён нет; `Role.headline` | 🟢 | сознательно, во избежание затенения |

## 7. Технический долг
Нет. `print`/`type: ignore`/`TODO`/`random`/`uuid`/`time` в движке отсутствуют. Дублирования нет
(reuse observability/workers). Секретов в коде нет; ключи — только через factory/settings.

## 8. Трассируемость
§R5.1/2/3/6/10, §R2.9, §R2.10, §R9.8, §R3.1, §R3.8 — Implemented + Statically Verified (offline);
live-LLM runtime — Pending (RV-11). См. `TRACEABILITY_STAGE2.md` (Этап 12, требования 93–105).

## 9. Вердикт
**Этап 12 — чисто (offline).** AI-движок — provider-agnostic оркестратор поверх Protocol'ов Этапа 11,
соответствует §R5/§R2.9/§R2.10/§R3.1/§R3.8 и всем 15 особым требованиям; строго типизирован (0
`type: ignore`); provider/model selection независимы; rewrite ≠ retry; fallback только в движке. Долга
нет. **Live-LLM runtime — RV-11.** Готов к Этапу 13 после подтверждения.
