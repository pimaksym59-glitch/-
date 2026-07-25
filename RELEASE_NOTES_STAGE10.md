# RELEASE NOTES — Stage 10 (API)

**Project:** AI Telegram Automation Platform · **Version:** 0.1.0 · **Date:** 2026-07-25
**Architecture Freeze:** ACTIVE · **SoT:** `MASTER_SPEC.md` v2.0 · **Contract:** `API_SPEC.md`

---

## Что сделано

HTTP-фундамент API (инфраструктура; бизнес-endpoint'ы придут вместе с сервисами):

- **Application Factory** (`create_app`) — без глобального FastAPI singleton; middleware, обработчики
  ошибок, роутеры и OpenAPI собираются внутри фабрики; экземпляры изолированы.
- **Lifespan** — единый, ленивый: инфраструктура (engine/Redis) не подключается на импорте; teardown
  делегирован в сервисный слой (api не импортирует `app.db`, §R3.1).
- **Dependency Injection** — `get_settings`/`get_health_service`; без глобальных сервисов;
  переопределяемо в тестах через `dependency_overrides` (паттерн `Annotated[T, Depends(...)]`).
- **Versioning + Router registration** — агрегатный `/api/v1`; добавление ресурсного роутера = запись
  в `_ROUTERS`, фабрика не меняется.
- **Error Handling** — единая **API Error Schema** `{"error":{code,message,details,request_id}}`;
  покрыты application-ошибки, request-валидация (422), `HTTPException` (404/405), необработанное (500,
  маскируется). Ни одно исключение не утекает мимо схемы.
- **Middleware** (независимые, явный порядок Request-ID → Logging → CORS → GZip): request-id
  генерируется/пробрасывается и попадает в логи и тело ошибок; structured-logging — точка интеграции.
- **Health** — liveness (`/api/v1/health/live`) и readiness (`/api/v1/health/ready`, 200/503)
  раздельно; readiness на инъектируемых probe — реальные PostgreSQL/Redis добавятся **без изменения API**.
- **Pagination** — entity-agnostic `PageParams`/`CursorParams` (limit≤100) + обобщённый `Page[T]`.
- **Auth** — только точки расширения (`Principal`/`Authenticator`/`current_principal`, анонимно, без
  OAuth/JWT и без RBAC-enforcement).
- **Background tasks** — инфраструктурный seam; доменная работа — **только через очередь** (§R10.1).
- **OpenAPI** — генерируется без предупреждений, уникальные `operationId`, корректные `response_model`,
  Error Schema в компонентах.
- **Entrypoint** — `app/main.py` (`uvicorn app.main:app`; §R3.5).

Toolchain зелёный: ruff, mypy-strict (144 файла, **0 `type: ignore`**), **pytest 167 passed / 6
skipped**; API-модули покрыты на **94–100%** offline.

## ⚠️ Ограничение верификации (нет живого PG/Redis/ASGI-сервера)

Реальная readiness-проба к PostgreSQL/Redis, запуск `uvicorn app.main:app`, lifespan против настоящих
соединений и сквозной CORS/gzip **не проверялись** — Runtime Verification Pending (**RV-9**).
Интеграционный тест написан, но пропущен без `RUN_INTEGRATION=1`+сервисы.

## Решения этапа
- **api-слой не касается БД (§R3.1):** DB-доступ через сервис (`HealthService`), иерархия ошибок в
  нейтральном `app/core/errors.py`, lifespan делегирует в `services/lifecycle`. Строгое соответствие
  guard'у слоёв, не отклонение.
- **CORS из настроек:** добавлены `cors_origins`/`cors_allow_credentials` в `Settings` (дефолт закрыт).
- **Новая зависимость:** `httpx` (**dev-only**, ASGI-тесты). Runtime-зависимостей не добавлено.

## Открытые риски
| Риск | Уровень | Где решается |
|---|---|---|
| API-runtime (readiness к PG/Redis, uvicorn, lifespan) не проверен | 🟠 | при PG+Redis (RV-9) |
| «Второй путь публикации» через BackgroundTasks | 🟢 | граница §R10.1 в коде/доке; домен — очередь |
| Auth-seam принят за реальную защиту | 🟡 | помечено extension-only; enforcement — auth-этап |

## Следующий этап
**Этап 11 — Provider abstractions + fakes** (§R13.1 шаг 11). Начинается **только по отдельной команде**.
