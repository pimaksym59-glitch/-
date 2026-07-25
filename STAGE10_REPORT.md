# STAGE10_REPORT.md — Этап 10: API (HTTP-фундамент)

**Этап:** §R13.1 шаг 10. **Дата:** 2026-07-25. **Статус:** завершён (с runtime-ограничением), ждёт
подтверждения. **План:** утверждён (`TASK_BREAKDOWN_STAGE10.md`) + 12 доп. требований владельца.

---

## ⚠️ Ограничение верификации (нет живого PG/Redis/ASGI-сервера)

По требованию — не имитировать runtime. **Три статуса:**
- **Implemented / Statically Verified (offline):** application factory, версионированный роутер, DI,
  единая обработка ошибок → Error Schema, middleware (request-id/logging/CORS/gzip), пагинация,
  liveness, readiness-**логика** (на инъектируемых фейковых probe), OpenAPI-генерация **без
  предупреждений**, auth/background-tasks — точки расширения. Проверено offline через ASGI-клиент
  (`httpx.ASGITransport`) с `dependency_overrides`.
- **Runtime Verification Pending (RV-9):** реальная readiness-проба к живым PostgreSQL/Redis, запуск
  `uvicorn app.main:app`, lifespan против настоящих соединений, сквозной CORS/gzip «по проводу».
  Интеграционный тест написан и **пропускается** без `RUN_INTEGRATION=1`+сервисы (не засчитан).

## T10.0 — Gate
`fastapi 0.139.2`, `starlette 1.3.1`, `pydantic 2.13.4`, `uvicorn 0.51.0`, `httpx 0.28.1` импортируются
на Python 3.14.6. Новая **dev**-зависимость `httpx` объявлена; runtime-стек уже в манифесте. Gate пройден.

## 1. Реализовано (по слоям, строго §R3.1)

| Слой / файл | Роль |
|---|---|
| `app/main.py` | entrypoint `uvicorn app.main:app` — `app = create_app()` (§R3.5) |
| `app/api/app.py` | **application factory** `create_app()` — нет глобального singleton; middleware/handlers/router/OpenAPI внутри фабрики |
| `app/api/lifespan.py` | единый lifespan; делегирует инфраструктуру в services (api не импортирует `app.db`) |
| `app/api/deps.py` | DI-провайдеры (`get_settings`, `get_health_service`) — переопределяемы в тестах |
| `app/api/auth.py` | auth **extension points**: `Principal`/`Authenticator`/`current_principal` (анонимно, без enforcement) |
| `app/api/errors.py` | обработчики → единая Error Schema (AppError / validation / HTTPException 404/405 / unexpected) |
| `app/api/pagination.py` | `PageParams`/`CursorParams` (limit≤100), entity-agnostic |
| `app/api/background.py` | seam `run_after_response` с границей §R10.1 (домен — только очередь) |
| `app/api/v1/router.py` | агрегатный `/api/v1` роутер + extension point для ресурсных роутеров |
| `app/api/v1/routes/health.py` | liveness/readiness — тонкие роуты (делегируют сервису) |
| `app/services/health.py` | use-case: liveness + readiness через инъектируемые `ReadinessProbe` (DB/Redis) |
| `app/services/lifecycle.py` | startup/shutdown инфраструктуры (dispose engine/redis только если создан) |
| `app/middleware/request_id.py` | Request-ID (генерация/проброс, `request.state` + ContextVar) |
| `app/middleware/logging.py` | структурное логирование запроса (request_id в каждой записи) |
| `app/core/errors.py` | нейтральная иерархия `AppError` (importable всеми слоями; §R4.2 → 409) |
| `app/schemas/{base,errors,pagination,health}.py` | Pydantic v2 DTO + **API Error Schema** + `Page[T]` |

## 2. Соответствие 12 доп. требованиям владельца
1. **Factory** — да; глобального FastAPI singleton нет; всё регистрируется в `create_app`. 2. **Lifespan**
единый, ленивый (нет соединений на импорте). 3. **DI** — все зависимости, без глобальных сервисов,
переопределяемы через `dependency_overrides` (проверено). 4. **Routers** — валидируют вход, вызывают
сервис, возвращают ответ; без предметной логики. 5. **Error Handling** — любое исключение → Error
Schema; необработанное 500 маскируется. 6. **Middleware** — одна задача на middleware; порядок явный
(Request-ID→Logging→CORS→GZip). 7. **Logging** — request_id в каждой записи; точка интеграции JSON-логгера
(FA-4). 8. **Health** — liveness≠readiness; readiness на инъектируемых probe — реальные PG/Redis
добавятся **без изменения API**. 9. **Background Tasks** — только seam; домен — через очередь (§R10.1).
10. **Pagination** — общая, entity-agnostic (`Page[T]`, limit≤100). 11. **OpenAPI** — генерируется без
предупреждений; уникальные `operationId`; корректные `response_model`; Error Schema в компонентах.
12. **Runtime** — не имитируется; RV-9. 13. **Три статуса** — соблюдены.

## 3. Верификация (offline)

| Проверка | Результат |
|---|---|
| `ruff format`/`check` | All checks passed |
| `mypy --strict` | Success: 144 files; **0 `type: ignore`** |
| `pytest` | **167 passed, 6 skipped** (все skipped = gated integration) |
| новых offline-тестов Этапа 10 | **37** (factory/health/errors/middleware/pagination/openapi/deps+auth/lifecycle+background) |
| coverage API | app.py/auth/background/deps/lifespan/pagination/router/health-route **100%**, errors 94%, middleware 96–100%, schemas 100%; services health 67% / lifecycle 87% (I/O — RV-9); main.py — entrypoint (RV-9) |
| OpenAPI | генерируется, **0 предупреждений**, уникальные operationId, Error Schema в components |

## 4. Ключевые инженерные решения (в рамках Freeze)
- **Слой api не касается БД (§R3.1).** Guard слоёв запрещает api импортировать `app.db`/`sqlalchemy`.
  Поэтому: DB-доступ — через сервис (`HealthService`), иерархия ошибок — в нейтральном
  `app/core/errors.py` (импортируема всеми слоями), lifespan делегирует teardown в `services/lifecycle`.
  Это **более строгое** соответствие §R3.1, не отклонение; в плане DI-«get_session» реализован как
  service-per-request seam.
- **DI через `Annotated[T, Depends(...)]`** — устраняет `B008`, современный паттерн FastAPI.
- **Единая Error Schema покрывает и `HTTPException`** (404/405): добавлен handler для
  `StarletteHTTPException`, чтобы дефолтный `{"detail":...}` не утекал мимо схемы.
- **CORS из настроек:** добавлены `cors_origins`/`cors_allow_credentials` в `Settings` (дефолт —
  закрытый список).
- **Новая dev-зависимость** `httpx`; runtime-зависимостей не добавлено.

## 5. Технический долг
Нет TODO/FIXME/`type: ignore`/`print`. Ресурсные роуты (channels/posts/…) — намеренно каркас
(со своими сервисами позже). JSON-логгер и RBAC-enforcement — точки расширения (FA-4 / auth-этап).

## 6. Границы (не делано)
Реальные соединения/сервер — RV-9. Доменные endpoint'ы, RBAC-проверки, OAuth/JWT/сессии — позже.
Источник CORS-origins по средам, курсорная выборка на данных — при появлении ресурсов.

## 7. Итог
HTTP-фундамент реализован полностью (factory/lifespan/DI/versioning/errors/middleware/health/pagination/
OpenAPI/auth-seam/background-seam), строго типизирован (mypy strict, 0 ignore), тонкие роуты, единая
Error Schema, OpenAPI без предупреждений. Runtime не проверялся (нет сервисов) — RV-9. **Этап 11 — по
отдельной команде.**

---

## Архитектурная проверка

- **Соответствие MASTER_SPEC:** реализованы §R3.5 (entrypoint), §R3.1 (тонкие роуты → services, api не
  знает SQL), §R10.1 (очередь — путь операций; граница background-tasks), §R12.10 (liveness≠readiness);
  подготовлены seam'ы §R10.4/R10.5 (auth/RBAC) и §R2.6 (изоляция); §R4.2 → 409. Контракт — `API_SPEC.md`.
- **Архитектурные отклонения:** нет. Единственное уточнение против буквы плана — DB-доступ api-слоя
  реализован через сервис (не «raw get_session» в api), потому что этого требует guard слоёв §R3.1.
  Это усиление соответствия SoT, а не отклонение.
- **Изменение Architecture Freeze:** не требуется. Новых ADR нет; добавление полей `cors_*` в конфиг —
  расширение параметров (§Appendix B-стиль), не архитектурное решение.
- **Новые технические риски:** (1) не допустить «второго пути публикации» через `BackgroundTasks` —
  митигировано границей §R10.1 в коде/доке; (2) преждевременная бизнес-логика в роутах — митигировано
  правилом «роут = валидация + сервис» и guard'ом слоёв (зелёный). Системных рисков не добавилось.
