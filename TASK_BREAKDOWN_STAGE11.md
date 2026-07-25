# TASK_BREAKDOWN — Stage 11 (Provider Abstractions + Fakes)

**Требует утверждения перед реализацией.** Цель (§R13.1 шаг 11): **инфраструктура абстракций
провайдеров + фейки** (LLM / Image / Embedding / Telegram / Metrics, §R2.10), чтобы вся система
запускалась и тестировалась **offline**. Только Protocol-интерфейсы, типизированный реестр,
impl-agnostic фабрика, capability-discovery, health-интерфейс, единый набор внутренних исключений и
**точки интеграции** для Retry/Timeout/Circuit-Breaker/Metrics/Logging. **Никакой бизнес-логики; НИ
ОДНОЙ конкретной интеграции (OpenAI/Anthropic/aiogram и т.п.)** — только инфраструктура и seam'ы.
Architecture Freeze ACTIVE; MASTER_SPEC — SoT.

## Размещение (по §R3.1)

§R3.1 (строка «домен … доменная логика **и адаптеры провайдеров**»): адаптеры/фейки провайдеров
живут в **доменных пакетах**; общая (generic) инфраструктура абстракций — в нейтральном слое.

- **`app/core/providers/`** — общая generic-инфраструктура (нейтральный слой, импортируема всеми):
  base-Protocol, capability, health-интерфейс, таксономия ошибок, типизированный registry,
  impl-agnostic factory + config-binding, resilience/observability seam'ы. **Не импортирует домен**
  (generic по TypeVar) → без циклов.
- **Доменные пакеты** — per-kind Protocol + фейки (соответствует существующим docstring'ам
  `app/llm` «interface + adapters + fake»): `app/llm/` (LLM + Embedding), `app/images/` (Image),
  `app/telegram/` (Telegram). **Metrics-провайдер** — переиспользует `app/workers/metrics.py`
  (`Metrics`/`NoOpMetrics` как фейк), без дублирования.
- **`app/services/providers.py`** — composition root: `build_provider_factory(settings)` регистрирует
  доменные фейки; `get_*_provider(settings)` (контракт §R2.10). Слой services (может импортировать
  домен + core).
- **`app/api/deps.py`** — `get_provider_factory` как DI-зависимость (req 8; api → services).

Направление зависимостей: `api → services → (domain) → app/core/providers`; `core/providers` —
generic, доменных импортов нет. Guard слоёв (`test_layering`) должен остаться зелёным.

---

## ⚠️ Ограничение среды (нет внешних API)

По требованию — не имитировать runtime. **Три статуса:**
- **Implemented / Statically Verified (offline):** **весь Этап 11 offline** — Protocol'ы, registry,
  factory + config-binding (выбор real/fake по наличию ключа §R2.10), capability-discovery, health-
  интерфейс, таксономия ошибок + классификация (transient/permanent), resilience/observability seam'ы
  (no-op/passthrough), **фейки полностью конформны Protocol** и детерминированы. Покрытие ~100%.
- **Runtime Verification Pending (RV-10):** реальные адаптеры вендоров (OpenAI/Anthropic/aiogram) и
  живые API-вызовы, включая фактическое поведение Retry/Timeout/Circuit-Breaker/rate-limit под
  нагрузкой — **вне объёма Этапа 11**; появляются на этапах 12 (AI) / 15 (Image) / 16 (Telegram).
  Установка/импорт `aiogram/anthropic/openai` на 3.14 — часть RV-1/адаптерных этапов.

## Особые требования владельца (1–11)
единые Protocol; типизированный registry; factory не знает конкретные реализации; фейки полностью
конформны Protocol; ошибки провайдеров → единый набор внутренних исключений; без бизнес-логики; без
конкретных интеграций (только инфраструктура/seam'ы); DI через существующую систему; Retry/Timeout/
Circuit-Breaker/Metrics — **точки интеграции без фактической реализации**; runtime не имитировать; три
статуса.

---

## Последовательность задач

### T11.0 — Зависимости + gate
- **Новых зависимостей нет** (фейки не требуют внешних SDK). `aiogram/anthropic/openai` остаются
  объявленными, но НЕ импортируются (их установка/использование — адаптерные этапы, RV-1/12/15/16).
- **Критерий:** существующий стек импортируется на 3.14; ни один вендорский SDK не импортируется в
  коде Этапа 11 (проверка grep). При необходимости нового пакета — СТОП+отчёт (без автодействий).

### T11.1 — Provider base + Kinds + Capability (`core/providers/base.py`)
- `ProviderKind` (StrEnum: `llm/image/embedding/telegram/metrics`); `Capability` (набор возможностей);
  базовый `Provider` Protocol: `name: str`, `kind: ProviderKind`, `capabilities() -> frozenset[Capability]`,
  `async def health() -> ProviderHealth`.
- **Критерий:** типизировано; generic; mypy strict; unit на членах enum/протоколе.

### T11.2 — Error taxonomy + mapping (`core/providers/errors.py`)
- Единый набор внутренних исключений: `ProviderError` (base) → `ProviderTimeout`,
  `ProviderRateLimited(retry_after)`, `ProviderUnavailable` (**transient**); `ProviderAuthError`,
  `ProviderInvalidRequest`, `ProviderContentRejected`, `ProviderNotSupported` (**permanent**).
- `classify(exc) -> Transience` — согласовано с `app/workers/retry` (§R7.5): 429 → transient +
  honor `retry_after`; перманентные → без ретрая. **Маппинг из SDK-исключений — extension point**
  (реализуется в адаптерах, не здесь).
- **Критерий:** все ошибки → внутренний набор; классификация покрыта unit; SDK-маппинг — только seam.

### T11.3 — Health interface (`core/providers/health.py`)
- `ProviderHealth` (healthy/degraded + detail); согласован с readiness-probe Этапа 10 (§R12.10) —
  провайдер может позже стать источником readiness без изменения API.
- **Критерий:** интерфейс типизирован; фейки возвращают healthy; unit.

### T11.4 — Typed Registry (`core/providers/registry.py`)
- Типизированный реестр builder'ов по ключу `(kind, name)`; `register`/`get`/`names(kind)`; unknown →
  **чистая ошибка** (`ProviderNotRegistered`), не падение процесса.
- **Критерий:** полностью типизирован (PEP 695 generics); unknown обработан; unit.

### T11.5 — Factory + Configuration Binding (`core/providers/factory.py`)
- **Impl-agnostic** фабрика: `select_implementation(kind, settings) -> "real"|"fake"` по §R2.10
  (ключ присутствует → real, иначе fake); `create(kind, *, name=None, settings)` строит через registry.
  **Фабрика не знает конкретные классы** — только реестр builder'ов.
- Config-binding: читает `settings` (anthropic/openai/telegram ключи; per-channel provider-name —
  задел). Ключ есть, но real-builder не зарегистрирован (Этап 11) → `ProviderNotRegistered` (честный
  extension point), не фейк-подмена.
- **Критерий:** выбор real/fake по ключу; фабрика без знания реализаций; unit (fake при None; real при
  зарегистрированном stub; ошибка при незарегистрированном real).

### T11.6 — Capability discovery (`core/providers/capabilities.py`)
- `supports(provider, capability) -> bool`; `require(provider, *caps)` → `ProviderNotSupported` при
  отсутствии; discovery по провайдеру.
- **Критерий:** unit на поддержке/отсутствии возможностей.

### T11.7 — Resilience integration points (`core/providers/resilience.py`) — БЕЗ реализации политик
- **Seam'ы**: `RetryPolicy` (ссылается на `app/workers/{retry,backoff}` для классификации/задержки —
  но **не** крутит цикл: ретраями владеет Executor §R8/§R7.5); `Timeout` (конфиг + `asyncio.wait_for`
  seam); `CircuitBreaker` Protocol + `NoOpCircuitBreaker`; объединяющий `call_with_resilience(fn, *,
  timeout=None, breaker=NoOp)` — passthrough-обёртка (по умолчанию просто await + опц. timeout).
- Rate-limit (§R2.8/§R7.6) — точка интеграции с `app/core/redis/rate_limiter` (FA-5), без вызова.
- **Критерий:** seam'ы типизированы; дефолт — passthrough/no-op; unit (passthrough пропускает; timeout
  срабатывает на медленной корутине через фейковый clock/`asyncio`); **фактические политики не реализуются**.

### T11.8 — Observability hooks (`core/providers/observability.py`) — Metrics/Logging точки
- `MetricsHook`/`LoggingHook` Protocol'ы + no-op дефолты; события вызова провайдера
  (attempt/success/failure/latency) — **точки интеграции**, дефолт no-op. (Metrics-провайдер §R2.10 —
  отдельно через `app/workers/metrics` в composition.)
- **Критерий:** hooks типизированы; no-op по умолчанию; unit (хуки вызываются в ожидаемых точках seam).

### T11.9 — Domain provider Protocols (per §R3.1)
- `app/llm/base.py` — `LLMProvider` (`async generate(...) -> LLMResult`; capability text/json/vision —
  как данные) + `EmbeddingProvider` (`async embed(texts) -> list[vector]`, размерность §R4.6).
- `app/images/base.py` — `ImageProvider` (`async generate(spec) -> ImageResult`; identity-reference —
  capability-флаг, §R6.1).
- `app/telegram/base.py` — `TelegramProvider` (`async send_message/send_photo/send_media_group -> SendResult`).
- **Критерий:** протоколы наследуют/используют `core/providers` base; типизированы; без HTTP/SDK; unit
  на структуре.

### T11.10 — Fake providers + Mock/Test providers (offline, конформны Protocol)
- **Фейки** (детерминированные, offline): `app/llm/fakes.py` (`FakeLLMProvider` — шаблонный текст по
  хэшу входа; `FakeEmbeddingProvider` — детерминированный нормированный вектор нужной размерности),
  `app/images/fakes.py` (`FakeImageProvider` — детерминированный placeholder через Pillow, уже
  установлен), `app/telegram/fakes.py` (`FakeTelegramProvider` — «отправляет», пишет вызовы, отдаёт
  фейковый message_id).
- **Mock/Test-провайдеры** (программируемые, для тестов взаимодействий): `core/providers/testing.py` —
  `RecordingProvider` (пишет вызовы), `FailingProvider(error=...)` (бросает заданный `ProviderError`
  для проверки маппинга/классификации).
- **Критерий:** фейки/моки **полностью конформны Protocol** (структурно, mypy + runtime); детерминизм;
  0 бизнес-логики; unit.

### T11.11 — Composition + DI (§R2.10 контракт, req 8)
- `app/services/providers.py` — `build_provider_factory(settings)` регистрирует доменные фейки в
  реестре; convenience `get_llm_provider/get_image_provider/get_embedding_provider/get_telegram_provider/
  get_metrics_provider(settings)` (§R2.10). Metrics-провайдер → `NoOpMetrics` (fake) / реальный exporter
  позже.
- `app/api/deps.py` — `get_provider_factory` (DI, переопределяемо в тестах через `dependency_overrides`).
- **Критерий:** `get_*_provider(settings)` отдаёт фейк при отсутствии ключа; DI-провайдер резолвится и
  переопределяется; unit + маленький ASGI-тест на override.

### T11.12 — Tests (offline)
- `tests/core/providers/*` — base/kinds/capability, errors+classify, registry (unknown), factory
  (real/fake selection, unregistered-real), resilience (passthrough/timeout/no-op breaker),
  observability (hooks вызваны), testing-doubles.
- `tests/llm|images|telegram/*` — фейки конформны Protocol + детерминизм.
- `tests/services/test_providers.py` — `get_*_provider(settings)` (fake при None), composition.
- `tests/api/test_provider_deps.py` — `get_provider_factory` DI + override.
- **Критерий:** offline зелёные ~100%; `mypy --strict` без `type: ignore`; guard слоёв зелёный.

### T11.13 — Reports + закрытие
- `STAGE11_REPORT.md` (+раздел «Архитектурная проверка»), `CODE_AUDIT_STAGE11.md`,
  `RELEASE_NOTES_STAGE11.md`; обновить `TECHNICAL_BACKLOG.md` (RV-10 real-adapter runtime; закрыть/
  уточнить FA-2 «выбор фейка при secret None» — реализовано; FA-5 rate-limit — точка интеграции
  подключена как seam), `TRACEABILITY_STAGE2.md` (§R2.10/R3.1/R3.8/R7.5/R2.8 — три статуса). README —
  секция Providers. Серия коммитов + тег `stage-11-providers`.
- **Критерий:** ruff/mypy-strict/pytest зелёные (offline); секреты не в git; тег на финале.

---

## Создаваемые/изменяемые файлы

| Файл | Действие |
|---|---|
| `app/core/providers/__init__.py` | новый — экспорт generic-инфраструктуры |
| `app/core/providers/{base,errors,health,registry,factory,capabilities,resilience,observability,testing}.py` | новые — generic-инфраструктура + seam'ы + test-doubles |
| `app/llm/{base,fakes}.py` | новые — `LLMProvider`/`EmbeddingProvider` + фейки |
| `app/images/{base,fakes}.py` | новые — `ImageProvider` + фейк (Pillow placeholder) |
| `app/telegram/{base,fakes}.py` | новые — `TelegramProvider` + фейк |
| `app/services/providers.py` | новый — composition + `get_*_provider(settings)` (§R2.10) |
| `app/api/deps.py` | edit — `get_provider_factory` (DI) |
| `tests/core/providers/*`, `tests/{llm,images,telegram}/*`, `tests/services/test_providers.py`, `tests/api/test_provider_deps.py` | новые — offline |
| `README.md` | edit — секция Providers |
| `STAGE11_REPORT.md`, `CODE_AUDIT_STAGE11.md`, `RELEASE_NOTES_STAGE11.md` | новые |
| `TECHNICAL_BACKLOG.md`, `TRACEABILITY_STAGE2.md` | обновление (живые) |

## Новые зависимости
**Нет.** Фейки не требуют внешних SDK (Pillow уже установлен). `aiogram/anthropic/openai` —
объявлены, но не импортируются до адаптерных этапов.

## Реализуемые требования MASTER_SPEC
§R2.10 (провайдер-абстракции с фейками, `get_*_provider(settings)`, offline) · §R3.1 (адаптеры в
домене; тонкие слои) · §R3.8 (новый провайдер = адаптер + регистрация в фабрике) · §R7.5 (классификация
ошибок/ретрай — согласование seam) · §R2.8/§R7.6 (пер-провайдерный rate-limit — точка интеграции) ·
§R2.9 (fallback-каскад — задел на уровне фабрики/ошибок) · §R12.10 (health-интерфейс, согласование с
readiness).

## Риски

| # | Риск | Уровень | Митигация |
|---|---|---|---|
| R1 | Реальные адаптеры вне объёма → «runtime провайдеров» не проверяется | 🟢 | по замыслу; фейки offline ~100%; real-runtime — RV-10 на этапах 12/15/16 |
| R2 | Resilience/CB/rate-limit — только seam'ы (риск недоспецификации) | 🟡 | Protocol'ы + no-op дефолты + чёткие docstring'и; реальные политики — на адаптерных этапах |
| R3 | Размещение инфраструктуры vs §R3.1 | 🟢 | generic-инфра в `core/providers` (нейтрально); адаптеры/протоколы в домене; composition в services; guard зелёный |
| R4 | Таксономия ошибок должна согласоваться с Executor-ретраем (§R7.5) | 🟡 | `classify()` маппит на `workers.retry` (transient/permanent, retry_after); покрыто unit |
| R5 | Factory «знает» реализации (нарушение req 3) | 🟢 | только registry builder'ов; выбор по config; конкретные классы — вне factory |
| R6 | Дублирование Metrics-абстракции (§R2.10) с `workers.metrics` | 🟢 | переиспользование `workers.metrics` (`Metrics`/`NoOpMetrics`); без дубля |
| R7 | Циклы core↔domain | 🟢 | `core/providers` generic (без импорта домена); регистрация фейков — в services (composition) |

---

## Архитектурная проверка (план)

- **Соответствие MASTER_SPEC:** реализуются §R2.10/R3.1/R3.8 (+ seam'ы §R7.5/R2.8/R12.10). Контракт
  `get_*_provider(settings)` и «адаптеры в домене» — дословно по SoT.
- **Отклонения:** нет. Новый под-пакет `app/core/providers/` — размещение generic-инфраструктуры в
  нейтральном слое (не новая архитектура; §R13.1 шаг 11). Адаптеры/фейки — в доменных пакетах (§R3.1).
- **Изменение Architecture Freeze:** не требуется; новых ADR нет.
- **Технические компромиссы:** реальные интеграции и их resilience-поведение отложены (RV-10, этапы
  12/15/16); Retry/Timeout/CB/Metrics — точки интеграции (по требованию владельца).
- **Новые риски:** только «seam'ы приняты за реализацию» — митигируется явными no-op дефолтами и
  пометками extension-only.

---

> **Стоп для утверждения.** К реализации Этапа 11 приступаю только после подтверждения плана. Без
> утверждения Этап 11 не начинаю.
