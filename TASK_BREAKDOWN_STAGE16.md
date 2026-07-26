# TASK_BREAKDOWN — Stage 16 (Telegram Engine)

**Требует утверждения перед реализацией.** Цель (§R13.1 шаг 16, §R7): **library-agnostic Telegram
Engine** — **исходящая публикация** (Bot API modes text/photo/album, formatter, rate-limit,
idempotency, retry/error-recovery) через `TelegramProvider` Этапа 11 **и входящая обработка апдейтов**
(update-pipeline, декларативный router, dispatcher, middleware, typed handler-registry, command/
callback/message handlers, state/session, webhook/polling-абстракция). **Никакого прямого aiogram;
только публичные Provider/port-Protocols. Без реальных Telegram-вызовов без реального провайдера.**
Architecture Freeze ACTIVE; SoT — MASTER_SPEC.

## Размещение (по §R3.1)

Доменный пакет **`app/telegram/`** (§R13.1 шаг 16; §R7; уже есть `base.py`/`fakes.py` Этапа 11 —
`TelegramProvider` + `FakeTelegramProvider`). Домен **не открывает БД/HTTP**; использует
`app/core/providers` (factory/observability), `app/telegram/base` (TelegramProvider Этапа 11),
`app/workers` (retry/backoff/errors — reuse, req 11). **Не импортирует aiogram** (req 1). State/rate-
limit/idempotency — через **порты** (реальные Redis-реализации — в composition). Composition —
`app/services/telegram.py`. Параллельная подсистема, независимая от AI/Validation/Image engines.

---

## ⚠️ Ограничение среды (нет реального Bot API)

По требованию — не имитировать runtime. **Три статуса:**
- **Implemented / Statically Verified (offline):** движок целиком offline на `FakeTelegramProvider`
  (Этап 11) + фейк-UpdateSource/StateStore/RateLimiter/IdempotencyGuard — DTO-mapping, update-pipeline,
  router, dispatcher, middleware, handler-registry/handlers, state/session, formatter, attachment-
  pipeline, publishing (modes), rate-limit/idempotency/retry/recovery seam'ы, metrics/logging hooks.
  Покрытие ~100%.
- **Runtime Verification Pending (RV-15):** реальный **Bot API/aiogram** (send/receive), реальные
  **webhook/polling**, реальный distributed rate-limiter под нагрузкой (§R7.6), реальная at-least-once-
  доставка (§R7.4). Наследует RV-10. Интеграционные тесты — skip.

## Особые требования владельца (1–20)
1 Engine ⟂ конкретной Telegram-библиотеки · 2 Telegram API только через публичные Provider Protocols ·
3 Router декларативен · 4 Handler Registry типизирован/расширяем · 5 каждый Handler — Protocol ·
6 Middleware Pipeline модульный · 7 State Management — только публичные интерфейсы · 8 Session Context —
отдельная immutable-модель · 9 Attachment Processing — самостоятельный Pipeline · 10 Webhook/Polling —
взаимозаменяемые стратегии · 11 Retry не дублирует бизнес-логику · 12 Idempotency — отдельный слой ·
13 Error Recovery — отдельный Pipeline · 14 Rate Limiting — только публичный Protocol · 15 metrics/
logging — hooks · 16 multi-platform — точки расширения (без реализации) · 17 без реальных Telegram-
вызовов без провайдера · 18 фейки детерминированы · 19 публичные интерфейсы — Protocol · 20 три статуса.

## Ключевые развязки
- **At-least-once (§R7.4):** `dedup_key` фиксируется **до** отправки; неоднозначный сбой → `needs_review`
  **без авто-ретрая** (error-recovery pipeline решает; идемпотентность — отдельный слой).
- **Retry (§R7.5) — reuse:** `MAX_RETRIES`/backoff/429-`retry_after` через `app/workers` (без дублирования,
  req 11); Telegram-ошибки классифицируются в transient/permanent (bad-token/kicked → permanent →
  needs_review).
- **Rate limit (§R7.6):** ключ `bot_token`+`channel_id`; через **порт** `RateLimiter` (реальный —
  distributed Redis Этапа 5, в composition).
- **Library-agnostic:** входящие апдейты — через `UpdateSource` порт (webhook/polling стратегии) →
  маппинг в **внутренние DTO** (не aiogram-типы); исходящие — через `TelegramProvider`.

---

## Последовательность задач

### T16.0 — Зависимости + gate
- **Новых зависимостей нет** (фейки; aiogram объявлен в манифесте, но **не импортируется** — реальный
  адаптер/RV-15). Проверить: в коде Этапа 16 нет `import aiogram` (grep).
- **Критерий:** нет новых пакетов; aiogram не импортируется; при нужде — СТОП+отчёт.

### T16.1 — Telegram DTO + Mapping (§R7, req 8)
- `app/telegram/types.py` — immutable DTO: `TelegramUser`/`Chat`/`Attachment`/`IncomingMessage`/
  `CallbackQuery`/`Command`/`Update` (+`UpdateKind`); `OutboundMessage`/`PublishRequest`/`PublishResult`;
  `SessionContext` (immutable, req 8). `app/telegram/mapping.py` — маппинг raw-update (dict) → `Update`
  DTO (**без aiogram-типов**).
- **Критерий:** DTO immutable/типизированы; маппинг детерминирован; unit.

### T16.2 — Webhook/Polling Abstraction (§R7.1, req 10)
- `app/telegram/source.py` — `UpdateSource` Protocol + взаимозаменяемые стратегии `WebhookSource`/
  `PollingSource` (порты; реальные — RV-15) + `FakeUpdateSource` (детерминированный поток апдейтов).
- **Критерий:** стратегии взаимозаменяемы (один Protocol); фейк offline; unit.

### T16.3 — Update Processing Pipeline (req — pipeline)
- `app/telegram/updates.py` — `UpdateProcessingPipeline`: raw → mapping → нормализованный `Update`.
  Одна ответственность на шаг.
- **Критерий:** pipeline модулен; детерминирован; unit.

### T16.4 — Middleware Pipeline (req 6) — модульно
- `app/telegram/middleware.py` — `UpdateMiddleware` Protocol + `MiddlewarePipeline` (упорядоченно,
  расширяемо без правки ядра). Пример: логирование/контекст.
- **Критерий:** модульно; добавление middleware без правки прочих; unit.

### T16.5 — Router (req 3) — декларативно
- `app/telegram/router.py` — **декларативный** `Router`: правила (`RouteRule`: kind/command/pattern →
  handler-name) как данные; сопоставление апдейта → имя хендлера. Без хардкода в движке.
- **Критерий:** правила — данные; матчинг детерминирован; unit.

### T16.6 — Handler Registry + Handlers (req 4/5)
- `app/telegram/registry.py` — типизированный расширяемый `HandlerRegistry` (по имени; unknown →
  чистая ошибка). `app/telegram/handlers.py` — `CommandHandler`/`CallbackHandler`/`MessageHandler`
  **отдельными Protocol** (req 5) + `HandlerContext` (session/provider-порт для ответа).
- **Критерий:** registry типизирован/расширяем; каждый handler — Protocol; unit.

### T16.7 — Dispatcher Integration
- `app/telegram/dispatcher.py` — `Dispatcher`: update → middleware → router → registry.get → handler.
  **Только оркестрация.**
- **Критерий:** маршрут update→handler; unit на фейках.

### T16.8 — State Management + Session Context (req 7/8)
- `app/telegram/state.py` — `StateStore` Protocol (**публичный интерфейс**; get/set/clear по ключу
  chat/user) + `FakeStateStore` (детерминированный in-memory); `SessionContext` — immutable-модель
  (уже в types). Реальный store (Redis/DB) — composition/RV.
- **Критерий:** state через порт; session immutable; unit.

### T16.9 — Formatter (§R7.7)
- `app/telegram/formatter.py` — MarkdownV2/HTML-экранирование + лимиты (текст ≤4096, подпись медиа
  ≤1024). Чистый/детерминированный.
- **Критерий:** экранирование корректно; лимиты применяются; unit.

### T16.10 — Attachment Processing Pipeline (§R7.8, req 9)
- `app/telegram/attachments.py` — самостоятельный `AttachmentPipeline`: нормализация/валидация медиа
  (альбом 1–10, типы фото/видео/документ). **Отдельный pipeline.**
- **Критерий:** альбом-лимиты; типы; unit.

### T16.11 — Rate Limiting (§R7.6, req 14) — публичный Protocol
- `app/telegram/ratelimit.py` — `RateLimiter` Protocol (ключ `bot_token`+`channel_id`) + `FakeRateLimiter`
  (детерминированный). Реальный distributed (Redis Этапа 5) — composition/RV.
- **Критерий:** через порт; фейк offline; unit.

### T16.12 — Idempotency (§R7.4, req 12) — отдельный слой
- `app/telegram/idempotency.py` — `IdempotencyGuard` Protocol + `FakeIdempotencyGuard`; `dedup_key`
  фиксируется **до** отправки (at-least-once). Отдельный слой (не в publish-логике).
- **Критерий:** повтор не шлёт дважды (фейк); dedup до отправки; unit.

### T16.13 — Retry Strategy (§R7.5, req 11) — reuse
- `app/telegram/retry.py` — классификация Telegram-ошибок (429→transient+`retry_after`; bad-token/
  kicked/no-rights→permanent) → маппинг на `app/workers.retry`/`backoff` (**без дублирования** бизнес-
  логики). Ретраями владеет Executor/recovery.
- **Критерий:** классификация согласована с workers-retry; unit.

### T16.14 — Error Recovery Pipeline (§R7.4, req 13) — отдельный Pipeline
- `app/telegram/recovery.py` — `ErrorRecoveryPipeline`: сбой отправки → classify → retry/needs_review/
  reschedule; **неоднозначный сбой → `needs_review`** (§R7.4, без авто-ретрая).
- **Критерий:** ambiguous → needs_review; permanent → needs_review; transient → retry-сигнал; unit.

### T16.15 — Publishing (§R7.8) — исходящая публикация
- `app/telegram/publishing.py` — `PublishService`: modes text/photo/album через `TelegramProvider`;
  formatter + attachment-pipeline + rate-limit + idempotency + recovery. Draft/approval — как флаги
  запроса (без публикации в draft, §R7.8).
- **Критерий:** режимы работают на фейк-провайдере; идемпотентность/лимит через порты; unit.

### T16.16 — Multi-platform seam (req 16) — без реализации
- `app/telegram/multiplatform.py` — `MessagingPlatform` Protocol (обобщение send/receive) — **точка
  расширения** для будущих платформ; без реализации.
- **Критерий:** seam типизирован; без реализации; unit (точка существует).

### T16.17 — Metrics/Logging hooks (req 15)
- `app/telegram/observability.py` — metrics/logging hooks (reuse `providers.observability` или локально).
  **Только hooks.**
- **Критерий:** no-op по умолчанию; unit.

### T16.18 — Telegram Engine + Composition + Fakes
- `app/telegram/engine.py` — `TelegramEngine`: связывает входящий dispatch (source→pipeline→dispatcher)
  и исходящий publish (`PublishService`). `app/telegram/fakes.py` — +`FakeUpdateSource`/`FakeStateStore`/
  `FakeRateLimiter`/`FakeIdempotencyGuard` (детерминированы). `app/services/telegram.py` — composition
  `build_telegram_engine`/`publish_post` (factory Этапа 11; реальные Redis-порты — здесь/RV).
- **Критерий:** движок собран offline; переопределяемо; unit end-to-end на фейках.

### T16.19 — Tests (offline)
- `tests/telegram/*` — mapping, source(fake), update-pipeline, middleware, router, registry/handlers,
  dispatcher, state/session, formatter, attachments, ratelimit, idempotency, retry, recovery, publishing
  (modes), multiplatform seam, engine end-to-end. `tests/services/test_telegram.py` — composition.
- **Integration (за `RUN_INTEGRATION=1`+Bot API, не запускается):** реальный send/receive/webhook/
  polling/rate-limit — **RV-15**.
- **Критерий:** offline зелёные ~100%; `mypy --strict` без `type: ignore`; guard зелёный; интеграционные skip.

### T16.20 — Reports + закрытие
- `STAGE16_REPORT.md` (+«Публичные контракты» Stable/Internal, +«Матрица зависимостей», +«Архитектурная
  проверка»), `CODE_AUDIT_STAGE16.md`, `RELEASE_NOTES_STAGE16.md`; обновить `TECHNICAL_BACKLOG.md`
  (RV-15 telegram-runtime; webhook/polling/multi-platform/MTProto — расширения), `TRACEABILITY_STAGE2.md`
  (§R7.* — три статуса). README — секция Telegram Engine. Серия коммитов + тег `stage-16-telegram-engine`.
- **Критерий:** ruff/mypy-strict/pytest зелёные (offline); секреты не в git; тег на финале.

---

## Создаваемые/изменяемые файлы

| Файл | Действие |
|---|---|
| `app/telegram/{types,mapping,source,updates,middleware,router,registry,handlers,dispatcher,state,formatter,attachments,ratelimit,idempotency,retry,recovery,publishing,multiplatform,observability,engine}.py` | новые — Telegram Engine |
| `app/telegram/fakes.py` | edit — +Fake UpdateSource/StateStore/RateLimiter/IdempotencyGuard |
| `app/telegram/__init__.py` | обновить (экспорт) |
| `app/services/telegram.py` | новый — composition `build_telegram_engine`/`publish_post` |
| `app/api/deps.py` | edit — (опц.) DI-seam |
| `tests/telegram/*`, `tests/services/test_telegram.py` | новые — offline |
| `README.md` | edit — секция Telegram Engine |
| `STAGE16_REPORT.md`, `CODE_AUDIT_STAGE16.md`, `RELEASE_NOTES_STAGE16.md` | новые |
| `TECHNICAL_BACKLOG.md`, `TRACEABILITY_STAGE2.md` | обновление (живые) |

## Новые зависимости
**Нет.** aiogram объявлен в манифесте, но **не импортируется** (реальный адаптер — RV-15). Retry/backoff
— reuse `app/workers`; rate-limit/idempotency/state — через порты (реальные Redis — Этап 5, composition).

## Реализуемые требования MASTER_SPEC
§R7.1 (Bot API через провайдер, не прямой aiogram) · §R7.4 (at-least-once → needs_review; dedup до
отправки) · §R7.5 (retry `MAX_RETRIES`/backoff/429-`retry_after`) · §R7.6 (rate-limit пер-бот, ключ
`bot_token`+`channel_id`) · §R7.7 (formatter MarkdownV2/HTML + лимиты) · §R7.8 (режимы text/photo/album/
draft/approval) · §R7.10 (логическая пер-канал очередь — через существующую очередь) · §R8.11/§R8.26
(DLQ/needs_review) · §R2.10 (только Provider Protocols) · §R2.8 (distributed rate-limiter) · §R3.1
(домен, без БД/HTTP/бизнес-правил) · §R3.8 (handlers/middleware/router/стратегии расширяемы).

## Риски

| # | Риск | Уровень | Митигация |
|---|---|---|---|
| R1 | Нет живого Bot API → send/receive/webhook/polling не проверяются | 🟠 | offline на фейках ~100%; реальное — RV-15 |
| R2 | Объём (in/out + framework) — большой | 🟡 | модульная декомпозиция; каждый компонент — отдельный файл/Protocol; строгий guard |
| R3 | At-least-once/идемпотентность (§R7.4) корректность | 🟠 | dedup до отправки + отдельный слой; ambiguous → needs_review; unit на всех ветвях |
| R4 | Retry-дублирование (req 11) | 🟢 | reuse `app/workers.retry`/`backoff`; только классификация Telegram-ошибок |
| R5 | Rate-limit пер-бот под нагрузкой (§R7.6) | 🟡 | порт + фейк offline; реальный distributed — RV-15 |
| R6 | Library-agnostic (не aiogram) | 🟢 | внутренние DTO + порты (provider/source); реальный aiogram-адаптер — RV-15 |
| R7 | Multi-platform seam | 🟢 | `MessagingPlatform` Protocol; без реализации |

---

## Публичные контракты Этапа 16 (Stable/Internal)

- **Protocol:** потребляемый `TelegramProvider` (Этап 11, **Stable**) · `UpdateSource` (**Stable**) ·
  `UpdateMiddleware` (**Stable**) · `CommandHandler`/`CallbackHandler`/`MessageHandler` (**Stable**) ·
  `StateStore` (**Stable**) · `RateLimiter` (**Stable**) · `IdempotencyGuard` (**Stable**) ·
  `MetricsHook`/`LoggingHook` (**Stable**) · `MessagingPlatform` (**Stable**, extension).
- **dataclass/DTO (immutable):** `TelegramUser` · `Chat` · `Attachment` · `IncomingMessage` ·
  `CallbackQuery` · `Command` · `Update` (+`UpdateKind` enum) · `OutboundMessage` · `PublishRequest` ·
  `PublishResult` · `SessionContext` · `RouteRule` — **Stable**.
- **Registry:** `HandlerRegistry` — **Stable**.
- **Pipeline/классы:** `UpdateProcessingPipeline` · `MiddlewarePipeline` · `Router` · `Dispatcher` ·
  `AttachmentPipeline` · `ErrorRecoveryPipeline` · `PublishService` · `TelegramEngine` — **Stable**;
  `WebhookSource`/`PollingSource` — **Stable** (стратегии).
- **Fakes:** `FakeTelegramProvider` (Этап 11) · `FakeUpdateSource`/`FakeStateStore`/`FakeRateLimiter`/
  `FakeIdempotencyGuard` — **Internal**.
- **Сервисные интерфейсы (`app/services/telegram.py`):** `build_telegram_engine`, `publish_post` — **Stable**.
- **Точки расширения:** реальный aiogram-адаптер (provider + update-source) · webhook/polling-реализации ·
  реальные `StateStore`/`RateLimiter`/`IdempotencyGuard` (Redis) · multi-platform (`MessagingPlatform`) ·
  MTProto stats-адаптер (§Appendix C) · metrics/logging-импл.

## Матрица зависимостей

- **Новые входящие (кто импортирует `app/telegram` [новое]):** `app/services/telegram.py`, `tests/telegram/*`.
- **Новые исходящие (что импортирует `app/telegram` [новое]):** `app/core/providers` (factory/
  observability), `app/telegram/base` (TelegramProvider Этапа 11), `app/workers` (retry/backoff/errors —
  reuse), stdlib. **НЕ импортирует** `aiogram`, `app/content`, `app/validators`, `app/images`,
  `app/memory`, `app/rag`, `app/api`/`app/services`/`app/db`/`sqlalchemy`. State/rate-limit/idempotency —
  через порты (реальные Redis — только в composition).
- **`app/services/telegram.py` исходящие:** `app/telegram`, `app/services/providers`, `app/core.config`,
  (опц.) `app/core/redis` для реальных портов. services→domain/core разрешено.
- **Циклы:** отсутствуют — `telegram` ⊄ content/validators/images/memory/rag; те ⊄ `telegram`.
- **Layering guard:** `telegram` = домен; запрещённые (`app.api`/`app.services`/`app.repositories`/
  `app.db`/`fastapi`) не импортируются → guard зелёный.

## Архитектурная проверка (план)

- **Соответствие MASTER_SPEC:** §R7.1–R7.10 (публикация + приём апдейтов; aiogram/webhook/polling —
  порты/RV), §R2.10 (только Provider Protocols), §R2.8 (distributed rate-limiter — порт), §R3.1/§R3.8.
- **Соответствие §R3.1, §R3.8 и требованиям Telegram-подсистемы:** §R3.1 — домен, без БД/HTTP/бизнес-
  правил, composition в services, guard зелёный; §R3.8 — handlers/middleware/router/стратегии/пайплайны
  расширяемы регистрацией без правки ядра; Telegram — library-agnostic (внутренние DTO + порты).
- **Влияние на AI Engine:** **нулевое** — параллельная подсистема; `app/content` не затрагивается.
- **Влияние на Validation Engine:** **нулевое** — `app/validators` не используется.
- **Влияние на Image Engine:** **нулевое** — `app/images` не используется (медиа-байты передаются как
  данные в publish-запросе).
- **Влияние на Provider Layer:** **нулевое** — новый потребитель `TelegramProvider` (Этап 11) через
  фабрику; провайдер-слой не меняется.
- **Изменение Architecture Freeze:** **не требуется** — новые модули в существующем `app/telegram`;
  паттерн «протоколы + фейки → реальные адаптеры позже». Новых ADR нет.
- **Потенциальные архитектурные риски:** (1) реальный Bot API/webhook/polling/rate-limit — RV-15;
  (2) at-least-once/идемпотентность — покрыто отдельным слоем + unit; (3) объём — митигируется модульной
  декомпозицией и guard'ом. Иных системных рисков нет.

---

> **Стоп для утверждения.** К реализации Этапа 16 приступаю только после подтверждения плана. Без
> утверждения Этап 16 не начинаю.
