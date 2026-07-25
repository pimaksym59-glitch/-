# STAGE11_REPORT.md — Этап 11: Provider Abstractions + Fakes

**Этап:** §R13.1 шаг 11. **Дата:** 2026-07-25. **Статус:** завершён (полностью offline), ждёт
подтверждения. **План:** утверждён (`TASK_BREAKDOWN_STAGE11.md` + 12 доп. требований владельца).

---

## ⚠️ Ограничение верификации (нет внешних API)

По требованию — не имитировать runtime. **Три статуса:**
- **Implemented / Statically Verified (offline):** **весь Этап 11 offline** — Protocol'ы, типизированный
  thread-safe registry, impl-agnostic factory + config-binding (§R2.10), capability-discovery,
  health-интерфейс, единый набор ошибок с retry-совместимой классификацией, resilience/observability
  seam'ы (no-op/passthrough), **детерминированные фейки, полностью конформные Protocol**. Подсистема
  покрыта на **~98%** (core-инфра/фейки/composition — 100%).
- **Runtime Verification Pending (RV-10):** реальные адаптеры вендоров (OpenAI/Anthropic/aiogram) и
  живые API-вызовы, фактическое поведение Retry/Timeout/Circuit-Breaker/rate-limit — **вне объёма
  Этапа 11**; появляются на этапах 12/15/16.

## T11.0 — Gate
Новых **runtime**-зависимостей нет; фейки не требуют вендорских SDK. `anthropic/openai/aiogram` не
импортируются в коде Этапа 11 (проверено). Импорт существующего стека на 3.14 — OK.

## 1. Реализовано

### Generic-инфраструктура — `app/core/providers/` (не импортирует домен; §R3.1, owner req 1)
| Модуль | Роль |
|---|---|
| `base.py` | `ProviderKind`, `Capability` (декларативно), `Provider` Protocol (name/kind/`capabilities()`/`health()`) |
| `errors.py` | единый набор: `ProviderError`/`Temporary`/`Permanent`/`Authentication`/`RateLimit`(retry_after)/`Timeout`/`UnsupportedCapability`; **subclass `workers.errors`** → `workers.retry.classify` работает без изменений (§R7.5) |
| `health.py` | `ProviderHealth` — декларативный снимок, **без сети** (owner req 8) |
| `registry.py` | `ProviderRegistry` — типизированный, **thread-safe** (`threading.Lock`), расширяемый; unknown → `ProviderNotRegistered` |
| `factory.py` | `ProviderFactory` — **impl-agnostic**: выбор real/fake по config (§R2.10); отсутствие ключа **не бросает** (owner req 5) |
| `capabilities.py` | `supports`/`require` — **декларативно** (членство, без проверок по классу, owner req 7) |
| `resilience.py` | `Timeout`/`CircuitBreaker`+`NoOp`/`call_with_resilience` — **только seam'ы**; делегирует asyncio/breaker; ретраи — у Executor (owner req 9) |
| `observability.py` | `ProviderObservability` — metrics/logging **hooks**, no-op/reuse `workers` (owner req 10) |
| `testing.py` | `FailingProvider`/`RecordingProvider` — mock/test-провайдеры |

### Доменные пакеты — Protocol + фейки (§R3.1: адаптеры в домене)
`app/llm/{base,fakes}.py` — `LLMProvider`/`EmbeddingProvider` + `FakeLLMProvider`/`FakeEmbeddingProvider`;
`app/images/{base,fakes}.py` — `ImageProvider` + `FakeImageProvider` (Pillow); `app/telegram/{base,
fakes}.py` — `TelegramProvider` + `FakeTelegramProvider`. **Фейки детерминированы (без случайности,
owner req 11):** текст по SHA-256 хэшу, эмбеддинг-векторы (нормированные) из хэша, solid-colour PNG из
хэша, монотонные message_id.

### Composition + DI
`app/services/providers.py` — `build_provider_factory(settings)` + `get_*_provider(settings)` (§R2.10);
metrics-провайдер = `NoOpMetrics`. `app/api/deps.py` — `get_provider_factory` (DI, переопределяемо).

## 2. Соответствие 12 доп. требованиям владельца
1 generic не импортирует домен ✅ (guard зелёный) · 2 Protocol + фейки конформны ✅ · 3 registry
типизирован/расширяем/thread-safe/impl-agnostic ✅ · 4 factory без конкретных классов ✅ · 5 §R2.10
полностью; нет ключа → fake, без исключений ✅ · 6 единый набор ошибок, классификация совместима с
retry ✅ · 7 capability декларативна ✅ · 8 health в Protocol, без сети ✅ · 9 Retry/Timeout/CB — только
seam'ы, существующая инфра ✅ · 10 metrics/logging — только hooks ✅ · 11 фейки offline/детерминированы/
без random ✅ · 12 runtime не имитируется, три статуса ✅.

## 3. Верификация (offline)
| Проверка | Результат |
|---|---|
| `ruff format`/`check` | All checks passed |
| `mypy --strict` | Success: 177 files, **0 `type: ignore`** |
| `pytest` | **210 passed, 6 skipped** (все skipped = ранее-gated integration; Этап 11 без RV-тестов) |
| coverage подсистемы | **~98%** (core-инфра/фейки/composition 100%; registry 94%, testing 86% — тривиальные хелперы) |

## 4. Технический долг
Нет TODO/FIXME/`type: ignore`/`print`. `TimeoutError` намеренно затеняет builtin (owner req 6, имя
зафиксировано). Reuse `workers.errors/metrics/log` — без дублирования (owner req 9). Секретов в коде нет.

## 5. Границы (не делано)
Реальные адаптеры (OpenAI/Anthropic/aiogram) и живые вызовы — RV-10 (этапы 12/15/16). Фактические
политики Retry/Timeout/CB/rate-limit — на адаптерных этапах (сейчас no-op seam'ы). Доменная генерация —
этапы 12+.

## 6. Итог
Инфраструктура абстракций провайдеров + фейки реализованы полностью и **offline**; строго типизированы;
фейки детерминированы и конформны Protocol; ошибки совместимы с retry Этапа 8; factory impl-agnostic и
не бросает при отсутствии ключа (§R2.10). Долга нет. **Этап 12 (AI Engine) — по отдельной команде.**

---

## Архитектурная проверка

- **Соответствие MASTER_SPEC:** реализованы §R2.10 (провайдер-абстракции с фейками, `get_*_provider`,
  offline), §R3.8 (новый провайдер = адаптер + регистрация), §R3.1 (адаптеры в домене; generic-инфра
  нейтральна), §R7.5 (классификация ошибок), §R12.10 (health). Контракт соблюдён дословно.
- **Соответствие §R2.10 и §R3.8:** §R2.10 — `get_*_provider(settings)` возвращает real при наличии
  ключа и зарегистрированном адаптере, иначе fake; отсутствие ключа не бросает исключений. §R3.8 —
  реестр builder'ов; новый провайдер добавляется регистрацией без изменения существующих модулей.
- **Новые архитектурные риски:** нет системных. Единственное наблюдение — «seam'ы могут быть приняты
  за реализацию»; митигировано явными no-op дефолтами и пометками extension-only.
- **Изменение Architecture Freeze:** **не требуется.** Новый под-пакет `app/core/providers/` —
  размещение generic-инфраструктуры в нейтральном слое (в рамках §R13.1 шаг 11); новых ADR нет.
