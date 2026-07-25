# RELEASE NOTES — Stage 12 (AI Engine)

**Project:** AI Telegram Automation Platform · **Version:** 0.1.0 · **Date:** 2026-07-25
**Architecture Freeze:** ACTIVE · **SoT:** `MASTER_SPEC.md` v2.0

---

## Что сделано

Provider-agnostic **AI-движок генерации** в `app/content` (§R5) — оркестратор поверх Provider Protocols
Этапа 11. **Никаких вендорских вызовов; никакой бизнес-логики** (правила приходят на этапах 14/17 через
seam'ы).

- **Модульный prompt-pipeline** (§R5.3): независимые contributors (task/persona/topic/constraints) →
  `PromptBuilder` (структура) → `templates` (рендер, без модель-специфики). Расширяемо без правки ядра.
- **Context-builder** (§R5.2/§R9.8): few-shot K=3–5 **только через Memory/Knowledge порты** (реальные
  адаптеры — Этап 13), бюджет ≤ `MAX_CONTEXT_TOKENS` через детерминированный `TokenEstimator` (без
  токенайзер-зависимости).
- **Provider selection ≠ Model selection** (§R5.10): `ProviderSelector` (только провайдер) и
  `ModelRouter` (только модель; body→`claude-opus-4-8`, иначе `claude-haiku-4-5`, декларативно) —
  независимы.
- **Structured output** — отдельный слой (json_mode + Pydantic), включается в validation-seam.
- **Validation-seam** (§R5.5) — расширяем; гейты качества — Этап 14.
- **Quality-rewrite** (`MAX_REWRITES`, §R5.6) — **отдельно от infra retry** (`MAX_RETRIES`).
- **Model-fallback** (§R2.9/R5.10) — **только в движке**; исчерпание → `GenerationExhausted` (очередь
  reschedule; очередь модель не выбирает).
- **Streaming / Cost / Metrics / Logging** — только hooks (no-op по умолчанию).
- Composition — `app/services/ai.py` (`build_ai_engine`, offline-дефолты).

Toolchain зелёный: ruff, mypy-strict (202 файла, **0 `type: ignore`**), **pytest 244 passed /
6 skipped**; подсистема покрыта на **~99%** (engine 100%).

## ⚠️ Ограничение верификации (нет реальных LLM)

Генерация против **живых** LLM (Anthropic/OpenAI) — фактический model-routing/fallback/streaming/
стоимость/латентность — **вне объёма Этапа 12**, отмечена **Runtime Verification Pending (RV-11)**;
появляется с реальными адаптерами. Новых зависимостей нет.

## Решения этапа
- **Rewrite ≠ Retry ≠ Fallback:** quality-rewrite (`MAX_REWRITES`) в движке; infra-retry — Executor
  Этапа 8; model-fallback (§R2.9) — в движке. Разведены и документированы.
- **Порты Memory/Knowledge:** тот же паттерн, что провайдеры Этапа 11 (protocols+фейки сейчас, реальные
  адаптеры — Этап 13).
- **Правила §R5.4–R5.11** (self-review/дедуп/бандит) — этапы 14/17 через validation-seam.
- `Role.headline` (не `title`) — во избежание затенения `str.title` на `StrEnum`.

## Открытые риски
| Риск | Уровень | Где решается |
|---|---|---|
| Генерация против живых LLM не проверена | 🟢 | по замыслу; с адаптерами (RV-11) |
| Token-оценка — эвристика | 🟡 | `TokenEstimator` seam; реальный токенайзер позже |
| Memory/Knowledge — фейки | 🟢 | реальные адаптеры — Этап 13 |

## Следующий этап
**Этап 13 — Memory / RAG** (§R13.1 шаг 13): реальные адаптеры Memory/Knowledge, реализующие порты
context-builder'а Этапа 12. Начинается **только по отдельной команде**.
