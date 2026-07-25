# TASK_BREAKDOWN — Stage 10 (API)

**Требует утверждения перед реализацией.** Цель (§R13.1 шаг 10): **HTTP-фундамент API** — FastAPI
**application factory** + `app/main.py` (§R3.5), lifespan, DI, версионирование `/api/v1`, регистрация
роутеров, единая обработка ошибок → **API Error Schema** (API_SPEC), health (liveness≠readiness,
§R12.10), OpenAPI без предупреждений, независимые middleware, точки расширения auth/background-tasks,
инфраструктура пагинации. **Роуты — тонкие: только валидация запроса и вызов сервисного слоя**
(§R3.1). Architecture Freeze ACTIVE; MASTER_SPEC — SoT; контракт — `API_SPEC.md` (новых требований не
вводит).

## Размещение
Пакеты **`app/api/`** (+`app/api/v1/`), **`app/middleware/`**, **`app/schemas/`**, **`app/services/`**
(уже созданы как пустые пакеты Этапа 1). Точка входа — **`app/main.py`** (§R3.5). Слои строго вниз:
`api → services → (domain, repositories) → models` (§R3.1). **api не импортирует domain/repositories
напрямую и не содержит SQL**; инфраструктурные зависимости (settings/session/redis) — только через
`app/core` и `app/db`/`app/core/redis`. Логирование middleware — через stdlib-logger (без импорта
`app.workers`, чтобы не связывать слои; структурный JSON-логгер — backlog FA-4).

---

## ⚠️ Ограничение среды (нет живого PG/Redis/HTTP-сервера)

По требованию — не имитировать runtime. **Три статуса:**
- **Implemented / Statically Verified (offline):** application factory, версионированный роутер,
  DI-провайдеры, error-mapping → единая схема, middleware (request-id/logging/CORS/gzip), пагинация,
  liveness, readiness-**логика** (на инъектированных фейковых probe), OpenAPI-генерация без
  предупреждений, auth/background-tasks — точки расширения. Проверяется offline через ASGI-клиент
  (`httpx.ASGITransport` / `TestClient`) с `app.dependency_overrides` — **без реального сервера/БД**.
- **Runtime Verification Pending (RV-9):** реальная readiness-проба к живым PostgreSQL/Redis, запуск
  `uvicorn app.main:app` и обслуживание HTTP по сети, lifespan против настоящих соединений,
  сквозное поведение CORS/gzip «по проводу». Интеграционные проверки **пропускаются** без
  `RUN_INTEGRATION=1`+сервисы (не засчитаны).

## Особые требования владельца (1–13)
FastAPI application factory; все зависимости — через DI; **без бизнес-логики в роутах**; роут =
валидация + вызов сервиса; Pydantic v2; все request/response-модели типизированы; все ошибки → единая
API Error Schema; middleware независимы; auth — только точки расширения (интерфейсы/зависимости, без
OAuth/JWT); у каждого endpoint корректные `response_model` и статус-коды; OpenAPI без предупреждений;
runtime не имитировать; три статуса (Implemented / Statically Verified / RV Pending).

## Ключевые развязки (без нарушения Architecture Freeze)
- **Сервисный слой ещё пуст** (домен — этапы 11–18). Поэтому Этап 10 поставляет **фундамент** и
  **единственный конкретный ресурс — health** (не требует домена). Ресурсные роуты (channels/posts/…
  из API_SPEC) — **каркас регистрации** (extension point), реализуются вместе со своими сервисами
  позже. Это соответствует §R13.1 (шаг 10 = «FastAPI + app/main.py»), не опережая домен.
- **Очередь — единственный путь операций (§R10.1).** `BackgroundTasks` FastAPI — только для
  тривиальных post-response side-effect (напр. запись в лог), **никогда** для доменной работы/
  публикации: реальный async-путь — постановка задачи в очередь через сервис (Producer Этапа 8).
  Второй путь публикации запрещён (§R10.1).
- **Auth/RBAC (§R10.4/R10.5)** — Этап 10 даёт только **seam**: `Principal`, Protocol `Authenticator`,
  зависимость `current_principal` (по умолчанию анонимный/не-enforced). OAuth/JWT/сессии и RBAC-проверки
  (в `services`) — позже; ни один endpoint пока на них не полагается (кроме health, который и так без auth).

---

## Последовательность задач

### T10.0 — Зависимости + gate
- Объявить **`httpx`** в dev-группе (`pyproject`) для ASGI-тестов. Проверить импорт
  `fastapi`/`uvicorn`/`starlette`/`httpx` на Python 3.14.
- Новых **runtime**-зависимостей нет: `fastapi`/`uvicorn[standard]`/`pydantic`/`pydantic-settings`
  уже в манифесте; CORS/GZip — встроены в starlette.
- **Критерий:** импорт всех пакетов успешен на 3.14; при несовместимости — СТОП+отчёт (без автодействий).

### T10.1 — Schemas foundation (Pydantic v2)
- `app/schemas/base.py` — базовая модель (`model_config`: `extra="forbid"`, `from_attributes=True`,
  строгие типы) — общий предок DTO.
- `app/schemas/errors.py` — **API Error Schema** (API_SPEC): `ErrorDetail{code,message,details,request_id}`
  + конверт `ErrorResponse{error: ErrorDetail}`.
- `app/schemas/pagination.py` — `Page[T]{items,total,next_cursor}` (обобщённая, PEP 695).
- `app/schemas/health.py` — `LivenessResponse`, `ReadinessResponse{status, checks:{name:ok}}`.
- **Критерий:** модели типизированы, Pydantic v2, `mypy --strict` чист; сериализация детерминирована.

### T10.2 — Error handling + Exception mapping
- `app/api/errors.py` — иерархия `APIError` (base) → `BadRequest(400)`/`Unauthorized(401)`/
  `Forbidden(403)`/`NotFound(404)`/`Conflict(409)`/`UnprocessableEntity(422)`/`RateLimited(429)`/
  `Internal(500)`; каждая несёт `code`/`message`/`details`.
- Обработчики (регистрируются фабрикой): `APIError` → `ErrorResponse` + корректный статус; переопределение
  `RequestValidationError` (FastAPI 422) → та же схема; catch-all `Exception` → `500` без утечки трейса.
- **Маппинг** (§API_SPEC, §R4.2): optimistic-lock конфликт `version` → `409`; доменная валидация → `422`;
  rate-limit → `429`. `request_id` из контекста включается в тело.
- **Критерий:** любой путь ошибки → единый JSON `{"error":{...}}`; статусы верны; трейс не утекает; unit-тесты всех веток.

### T10.3 — Dependency Injection providers
- `app/api/deps.py` — FastAPI-зависимости: `get_settings` (из `app.core.config`), `get_session`
  (yield `AsyncSession` из `app.db.session`, транзакция — вызывающего), `get_redis` (клиент из
  `app.core.redis.manager`). Все — **ленивые**, без соединения на импорте.
- **Критерий:** провайдеры типизированы; резолвятся в тесте (settings — без сети); session/redis —
  сконструированы лениво (реальное I/O — RV-9).

### T10.4 — Authentication integration points (без реализации авторизации)
- `app/api/auth.py` — `Principal` (id/role/anonymous), Protocol `Authenticator.authenticate(request)`,
  зависимость `current_principal` (по умолчанию анонимный; **не** enforced). Заглушка `require_role(...)`
  как будущая точка RBAC (§R10.5) — сейчас no-op/passthrough с явной пометкой.
- **Критерий:** seam типизирован; OAuth/JWT отсутствует; ни один endpoint не полагается на auth;
  тест подтверждает анонимный дефолт и подменяемость через DI.

### T10.5 — Middleware (независимые)
- `app/middleware/request_id.py` — генерирует/пробрасывает `X-Request-ID` (uuid), кладёт в
  `contextvar` (доступен error-хендлерам и логам).
- `app/middleware/logging.py` — структурное логирование запрос/ответ (метод/путь/статус/длительность/
  request_id) через stdlib-logger; **без** секретов/тел.
- Встроенные `CORSMiddleware` и `GZipMiddleware` (starlette) подключаются фабрикой (CORS — из настроек,
  дефолт — закрытый список origins; compression — порог по размеру).
- **Критерий:** каждый middleware самодостаточен и не зависит от других; порядок задаётся фабрикой
  (request-id — внешний, чтобы id был доступен всем); unit-тесты: заголовок id присутствует и
  пробрасывается, CORS-заголовки на preflight, gzip на большом ответе.

### T10.6 — Pagination infrastructure
- `app/api/pagination.py` — зависимость `PageParams(limit<=100, offset>=0)` и `CursorParams(cursor?)`
  (§API_SPEC), помощник сборки `Page[T]`.
- **Критерий:** валидация границ (limit≤100) → `422` при нарушении; `Page[T]` типобезопасна; unit-тесты.

### T10.7 — Health service + endpoints (liveness ≠ readiness, §R12.10)
- `app/services/health.py` — `check_liveness()` (процесс жив) и `check_readiness(probes)` —
  агрегирует **инъектируемые** dependency-probes (DB/Redis/провайдеры) в `ReadinessReport`.
- `app/api/v1/routes/health.py` — `GET /health/live` → `200` (liveness); `GET /health/ready` →
  `200`/`503` (readiness) с `response_model` и явными статусами; **без auth** (§API_SPEC).
- **Критерий:** роут тонкий (делегирует сервису); readiness=`503` при недоступной зависимости и `200`
  при здоровых фейковых probe (через `dependency_overrides`); реальная проба к PG/Redis — RV-9.

### T10.8 — API versioning + Router registration
- `app/api/v1/router.py` — агрегатный `APIRouter(prefix="/api/v1")`, монтирует health; **extension
  point** для будущих ресурсных роутеров (channels/posts/…): декларативный список подроутеров.
- **Критерий:** версионный префикс единый; добавление роутера не требует правки фабрики; тест: health
  доступен под `/api/v1/health/*`, версия изолирована.

### T10.9 — Application Factory + Lifespan + OpenAPI
- `app/api/app.py` — `create_app(settings=None) -> FastAPI`: собирает middleware, обработчики ошибок,
  v1-роутер, OpenAPI-метаданные (title/version/servers/tags), lifespan. **Без глобального состояния на
  импорте** (фабрика, а не модульный singleton).
- `app/api/lifespan.py` — `@asynccontextmanager lifespan(app)`: startup (подготовка ресурсов —
  engine/redis-manager, **лениво**, без жёсткого connect) / shutdown (graceful `aclose`/`dispose`).
- OpenAPI: у всех endpoint — `response_model` + статус + уникальные `operation_id`/имена → **генерация
  без предупреждений**.
- **Критерий:** `create_app()` возвращает изолированный экземпляр; `app.openapi()` строится без
  warnings; повторные вызовы фабрики независимы; lifespan закрывает ресурсы (проверка на фейках).

### T10.10 — Entrypoint `app/main.py` (§R3.5)
- `app/main.py` — `app = create_app()` для `uvicorn app.main:app`. Импорт **не** открывает соединений.
- **Критерий:** импортируется offline; фактический запуск сервера — RV-9.

### T10.11 — Background tasks integration point
- Тонкая зависимость/помощник для `BackgroundTasks` (post-response side-effect) с **явной границей**:
  только тривиальные задачи (напр. лог/уведомление), **не** доменная работа — она идёт в очередь
  (§R10.1). Документировать различие; предоставить seam, не бизнес-логику.
- **Критерий:** seam типизирован; в docstring зафиксирован запрет второго пути публикации; тест — вызов
  фонового колбэка после ответа.

### T10.12 — Tests
- **Offline (ASGI, без сервера/БД):** factory (экземпляр/изоляция), health (live 200; ready 503 без
  зависимостей и 200 с фейковыми probe через overrides), errors (все ветки → единая схема + статусы +
  request_id), middleware (request-id header/propagation, CORS preflight, gzip), pagination (границы/
  модель), openapi (схема строится, без warnings, содержит Error Schema, версия/тайтл), deps (резолв
  settings; auth-seam анонимен и подменяем), background-tasks (колбэк выполнен).
- **Integration (за `RUN_INTEGRATION=1`+сервисы, не запускается):** readiness к живым PG/Redis,
  `uvicorn`-запуск/обслуживание, lifespan против реальных соединений — **RV-9 Pending**.
- **Критерий:** offline зелёные; интеграционные написаны и корректно skip; `mypy --strict` чист; OpenAPI без warnings.

### T10.13 — Reports + закрытие
- `STAGE10_REPORT.md`, `CODE_AUDIT_STAGE10.md`, `RELEASE_NOTES_STAGE10.md`; **обновить**
  `TECHNICAL_BACKLOG.md` (RV-9 api-runtime; при необходимости FA-заметки по auth/RBAC/JSON-логгеру) и
  `TRACEABILITY_STAGE2.md` (§R3.5/R3.1/R10.1/R10.5/R12.10/R2.6/R4.2 — три статуса). README — секция API.
  Серия коммитов + тег `stage-10-api`.
- **Критерий:** ruff/mypy-strict/pytest зелёные (offline); OpenAPI без warnings; секреты не в git; тег на финале.

---

## Создаваемые/изменяемые файлы

| Файл | Действие |
|---|---|
| `pyproject.toml` | +`httpx` (dev) |
| `app/main.py` | новый — entrypoint `create_app()` (§R3.5) |
| `app/api/app.py` | новый — application factory |
| `app/api/lifespan.py` | новый — lifespan (startup/shutdown, ленивые ресурсы) |
| `app/api/deps.py` | новый — DI-провайдеры (settings/session/redis) |
| `app/api/auth.py` | новый — auth extension points (Principal/Authenticator/current_principal) |
| `app/api/errors.py` | новый — иерархия `APIError` + обработчики + маппинг |
| `app/api/pagination.py` | новый — PageParams/CursorParams + сборка `Page[T]` |
| `app/api/v1/router.py` | новый — агрегатный v1-роутер + extension point |
| `app/api/v1/routes/health.py` | новый — liveness/readiness |
| `app/api/v1/routes/__init__.py` | новый — пакет роутов |
| `app/middleware/request_id.py` | новый — Request-ID middleware |
| `app/middleware/logging.py` | новый — structured request logging |
| `app/services/health.py` | новый — liveness/readiness use-case (probes) |
| `app/schemas/{base,errors,pagination,health}.py` | новые — DTO + API Error Schema |
| `app/api/__init__.py` / `app/schemas/__init__.py` / `app/middleware/__init__.py` | обновить (экспорт) |
| `tests/api/*` | новые — offline ASGI + gated integration |
| `README.md` | edit — секция API |
| `STAGE10_REPORT.md`, `CODE_AUDIT_STAGE10.md`, `RELEASE_NOTES_STAGE10.md` | новые |
| `TECHNICAL_BACKLOG.md`, `TRACEABILITY_STAGE2.md` | обновление (живые) |

## Новые зависимости
`httpx` (**dev-only**, ASGI-тесты). Runtime — без новых: `fastapi`/`uvicorn[standard]`/`pydantic(v2)`/
`pydantic-settings` уже в манифесте; CORS/GZip — встроены в starlette.

## Реализуемые требования MASTER_SPEC
§R3.5 (entrypoint `app/main.py`) · §R3.1 (тонкие роуты → services, без SQL/логики) · §R10.1 (панель =
клиент; очередь — путь операций; запрет второго пути публикации — граница background-tasks) · §R10.4/
R10.5 (auth/RBAC — точки расширения на бэкенде) · §R12.10 (liveness ≠ readiness) · §R2.6 (изоляция
каналов — seam зависимости, enforcement в services позже) · §R4.2 (optimistic-lock → `409`) · §R12.2
(секреты write-only — база DTO) · API_SPEC (единая Error Schema, пагинация, статус-коды).

## Риски

| # | Риск | Уровень | Митигация |
|---|---|---|---|
| R1 | Сервисный слой пуст → конкретен только health; ресурсные роуты — каркас | 🟠 | health как эталон тонкого роута; фабрика/middleware/errors/openapi покрыты offline; ресурсы — со своими сервисами позже |
| R2 | Readiness-проба требует живых PG/Redis | 🟠 | RV-9; offline — логика на инъектируемых фейковых probe (503/200) |
| R3 | OpenAPI без предупреждений требует дисциплины (response_model/статус/уникальные id) | 🟡 | обязательные `response_model`+статус; тест строит схему и проверяет отсутствие warnings |
| R4 | `BackgroundTasks` как «второй async-путь» (нарушение §R10.1) | 🟡 | явная граница в коде/доке: только тривиальные side-effect; доменная работа — только очередь |
| R5 | Auth-seam принят за реальную защиту | 🟡 | явная пометка «extension-only, не enforced»; ни один endpoint не полагается на него |
| R6 | Порядок/независимость middleware | 🟢 | каждый самодостаточен; порядок фиксируется фабрикой (request-id внешний) |
| R7 | Слоевые нарушения (api→workers/domain) | 🟢 | логирование через stdlib; зависимости только из `core`/`db`/`core.redis`; guard слоёв зелёный |

---

## Архитектурная проверка после Этапа 10

Краткий срез для владельца (заполняется по факту в отчётах; ожидания на этапе планирования):

- **Отклонения от MASTER_SPEC:** не ожидаются. Этап 10 реализует §R3.5/R3.1/R10.1/R12.10 и готовит
  seam'ы для §R10.4/R10.5/R2.6; контракт — `API_SPEC.md` (новых требований не вводит). Ресурсные
  endpoint'ы намеренно отложены до появления сервисов — это соответствие плану §R13.1, не отклонение.
- **Изменение Architecture Freeze:** не требуется. Новых архитектурных решений/ADR нет; фабрика,
  слои, очередь-как-путь-операций — в рамках зафиксированной архитектуры.
- **Технические компромиссы:** (1) auth — только точки расширения (без OAuth/JWT/RBAC-enforcement);
  (2) структурный JSON-логгер отложен (middleware пишет через stdlib) — backlog FA-4; (3) readiness к
  реальным сервисам — RV-9; (4) ресурсные роуты — каркас регистрации. Все — плановые, не костыли.
- **Новые архитектурные риски:** основной — не допустить «второго пути публикации» через
  `BackgroundTasks` (митигируется границей §R10.1) и преждевременной бизнес-логики в роутах
  (митигируется правилом «роут = валидация + вызов сервиса» и guard'ом слоёв). Иных новых системных
  рисков не предвидится.

---

> **Стоп для утверждения.** К реализации Этапа 10 приступаю только после подтверждения плана.
> Без утверждения Этап 10 не начинаю.
