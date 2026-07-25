# CODE_AUDIT_STAGE11.md — Аудит качества кода Этапа 11 (Provider Abstractions + Fakes)

**Область:** `app/core/providers/*`, `app/llm/{base,fakes}`, `app/images/{base,fakes}`,
`app/telegram/{base,fakes}`, `app/services/providers.py`, `app/api/deps.py`, `tests/{core/providers,
llm,images,telegram,services}/*`, `tests/api/test_provider_deps.py`. **Дата:** 2026-07-25.
**Метод:** self-review + ruff/mypy/pytest/coverage. **Ограничение:** внешние API не вызывались.

---

## 1. Слои / архитектура (§R3.1)
- **Generic-инфра `app/core/providers` не импортирует ни один доменный пакет** (owner req 1) — проверено;
  зависимости только «наружу» (config, workers-leaf errors/metrics/log). `test_layering` зелёный.
- Адаптеры/фейки — в доменных пакетах (§R3.1); composition — в services; DI — в api. Циклов нет
  (core generic; регистрация фейков в services).

## 2. Соответствие особым требованиям владельца (1–12)
| # | Требование | Статус |
|---|---|---|
| 1 | generic не импортирует домен, deps наружу | ✅ (guard + ревью) |
| 2 | Protocol (PEP 544); фейки конформны | ✅ (mypy структурно + тесты `p: LLMProvider = Fake()`) |
| 3 | registry типизирован/расширяем/thread-safe/impl-agnostic | ✅ (`threading.Lock`; concurrency-тест 50 потоков) |
| 4 | factory без конкретных классов | ✅ (только registry + config) |
| 5 | §R2.10 полностью; нет ключа → fake, без исключений | ✅ (тесты fake/real/override; missing-key не бросает) |
| 6 | единый набор ошибок; классификация ~ retry | ✅ (subclass `workers.errors`; `classify` покрыт) |
| 7 | capability декларативна, без проверок по классу | ✅ (`supports`/`require` по членству) |
| 8 | health в Protocol, без сети | ✅ (декларативный `ProviderHealth`) |
| 9 | Retry/Timeout/CB — только seam'ы, существующая инфра | ✅ (asyncio/breaker/`workers.retry`; ретраи — Executor) |
| 10 | metrics/logging — только hooks | ✅ (`NoOpMetrics`/`EventLogger`, reuse) |
| 11 | фейки offline/детерминированы/без random | ✅ (SHA-256, без `random/uuid/time`) |
| 12 | runtime не имитируется, три статуса | ✅ (RV-10; Этап 11 offline) |

## 3. Типизация / стиль
- `mypy --strict` — **0 ошибок (177 файлов), 0 `type: ignore`**. `ruff` — All checks passed.
- PEP 695 дженерики (`ProviderRegistry`?/`call_with_resilience[T]`); Protocol'ы структурные — фейки
  удовлетворяют без наследования; `cast` в composition (не `type: ignore`).
- `from __future__ import annotations` везде; файлы малы; docstrings на модуль/публичный класс.

## 4. Корректность (ключевые точки)
- **Retry-совместимость:** `TemporaryProviderError`/`PermanentProviderError` наследуют
  `workers.errors.Transient/Permanent` → `workers.retry.classify` даёт transient/permanent без правок
  Executor (проверено рантайм-тестом на всех подтипах).
- **Factory (§R2.10):** real только при наличии ключа **и** зарегистрированном real-адаптере; иначе
  fake; отсутствие ключа никогда не бросает (owner req 5) — покрыто по всем `ProviderKind`.
- **Registry thread-safe:** мутации под `Lock`; конкурентная регистрация 50 потоков → 50 записей.
- **Детерминизм фейков:** одинаковый вход → идентичный выход (текст/вектор/PNG-байты/id); векторы
  нормированы (‖v‖≈1); PNG-сигнатура валидна.
- **Resilience seam:** passthrough возвращает значение; timeout → `ProviderError.TimeoutError`;
  открытый breaker → `TemporaryProviderError`; прочие ошибки — пробрасываются + `record_failure`.
- **Capability:** `require` бросает `UnsupportedCapabilityError` (permanent) при отсутствии.

## 5. Тесты / покрытие
- **43 offline-теста** (registry/factory/errors/capabilities/resilience/doubles + фейки LLM/Image/
  Telegram + composition + DI-override через ASGI). RV-тестов нет (Этап 11 offline).
- coverage подсистемы **~98%**: core-инфра/фейки/composition 100%; registry 94% (`has`), testing 86%
  (методы-конформеры test-doubles) — тривиальные хелперы, логических пробелов нет.

## 6. Наблюдения / риски
| # | Наблюдение | Severity | Примечание |
|---|---|---|---|
| A | Реальные адаптеры/вызовы не выполнялись | 🟢 | по замыслу; RV-10 (этапы 12/15/16) |
| B | Resilience/CB/rate-limit — seam'ы (no-op) | 🟡 | реальные политики — адаптерные этапы; явные пометки |
| C | `TimeoutError` затеняет builtin | 🟢 | имя зафиксировано владельцем (req 6); ссылка на builtin только в resilience |
| D | `core/providers` импортирует `workers` (errors/metrics/log) | 🟢 | leaf-инфра, не домен; reuse (req 9), без циклов |
| E | Маппинг ключ→провайдер в factory предварительный | 🟢 | уточняется реальными адаптерами; отсутствие ключа → fake |

## 7. Технический долг
Нет. `print()`/`type: ignore`/`TODO`/`random` отсутствуют. Дублирования нет (reuse `workers`). Секретов
в коде нет; ключи читаются только из `settings`.

## 8. Трассируемость
§R2.10/R3.8/R3.1/R7.5/R2.8/R12.10 — Implemented + Statically Verified (offline); real-adapter runtime —
Pending (RV-10). См. `TRACEABILITY_STAGE2.md` (Этап 11, требования 81–92).

## 9. Вердикт
**Этап 11 — чисто (offline).** Инфраструктура провайдеров соответствует §R2.10/R3.8/R3.1 и всем 12
особым требованиям; строго типизирована (0 `type: ignore`); фейки детерминированы и конформны Protocol;
ошибки совместимы с retry; factory impl-agnostic и безопасна при отсутствии ключей. Долга нет.
**Real-provider runtime — RV-10.** Готов к Этапу 12 после подтверждения.
