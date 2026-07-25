# RELEASE NOTES — Stage 11 (Provider Abstractions + Fakes)

**Project:** AI Telegram Automation Platform · **Version:** 0.1.0 · **Date:** 2026-07-25
**Architecture Freeze:** ACTIVE · **SoT:** `MASTER_SPEC.md` v2.0

---

## Что сделано

Инфраструктура абстракций провайдеров + фейки (§R2.10) — вся система запускается и тестируется
**offline**. Только Protocol'ы, реестр, фабрика и точки расширения; **ни одной конкретной интеграции**.

- **Generic-инфраструктура `app/core/providers`** (не импортирует домен):
  - `base` — `Provider` Protocol (kind, декларативные `capabilities`, non-networking `health`).
  - `errors` — единый набор внутренних исключений (`ProviderError`, `AuthenticationError`,
    `RateLimitError`, `TimeoutError`, `TemporaryProviderError`, `PermanentProviderError`,
    `UnsupportedCapabilityError`), **классификация совместима с retry Этапа 8** (§R7.5).
  - `registry` — типизированный, **thread-safe**, расширяемый; unknown → чистая ошибка.
  - `factory` — **impl-agnostic**; §R2.10: real при наличии ключа и адаптера, иначе fake;
    **отсутствие ключа не бросает исключений**.
  - `capabilities` — декларативная discovery (по членству, не по классу).
  - `resilience` — Timeout / CircuitBreaker / `call_with_resilience` — **только seam'ы** (no-op/
    passthrough; ретраи остаются у Executor).
  - `observability` — metrics/logging **hooks** (no-op, reuse `workers`).
  - `testing` — mock/test-провайдеры (`FailingProvider`/`RecordingProvider`).
- **Доменные протоколы + фейки** (§R3.1): `app/llm` (LLM+Embedding), `app/images` (Image), `app/telegram`
  (Telegram). Фейки **детерминированы, без случайности**, offline.
- **Composition + DI:** `app/services/providers.py` (`get_*_provider(settings)`, §R2.10);
  `app/api/deps.get_provider_factory` (переопределяемо в тестах).

Toolchain зелёный: ruff, mypy-strict (177 файлов, **0 `type: ignore`**), **pytest 210 passed /
6 skipped**; подсистема покрыта на **~98%** (core-инфра/фейки/composition 100%).

## ⚠️ Ограничение верификации (нет внешних API)

Реальные адаптеры вендоров (OpenAI/Anthropic/aiogram) и живые API-вызовы, фактическое поведение
Retry/Timeout/Circuit-Breaker/rate-limit — **вне объёма Этапа 11** и отмечены **Runtime Verification
Pending (RV-10)**; появляются на этапах 12/15/16. Новых runtime-зависимостей нет.

## Решения этапа
- **§R2.10 контракт:** `get_*_provider(settings)` — real-if-key-else-fake; отсутствие ключа → fake без
  исключений (закрывает backlog **FA-2**).
- **Retry-совместимость:** provider-ошибки наследуют `workers.errors.Transient/Permanent` →
  `workers.retry.classify` работает без изменений Executor.
- **Размещение (§R3.1):** generic-инфра в нейтральном `app/core/providers`; адаптеры/фейки — в домене;
  composition — в services. Циклов нет; guard слоёв зелёный.
- **Rate-limit (FA-5):** точка интеграции провайдеров подключена как seam; фактический вызов — этапы 12/16.

## Открытые риски
| Риск | Уровень | Где решается |
|---|---|---|
| Real-provider runtime (адаптеры/вызовы/политики) не проверен | 🟢 | по замыслу; этапы 12/15/16 (RV-10) |
| Resilience/CB/rate-limit — seam'ы (no-op) | 🟡 | реальные политики на адаптерных этапах |

## Следующий этап
**Этап 12 — AI Engine** (§R13.1 шаг 12): доменная генерация текста, реальные LLM-адаптеры (Anthropic/
OpenAI) поверх Protocol'ов Этапа 11. Начинается **только по отдельной команде**.
