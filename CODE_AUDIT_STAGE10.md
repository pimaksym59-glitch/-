# CODE_AUDIT_STAGE10.md — Аудит качества кода Этапа 10 (API)

**Область:** `app/api/*`, `app/middleware/*`, `app/services/{health,lifecycle}.py`,
`app/schemas/*`, `app/core/errors.py`, `app/main.py`, `tests/api/*`. **Дата:** 2026-07-25.
**Метод:** self-review + ruff/mypy/pytest/coverage + guard слоёв. **Ограничение:** без живого
PG/Redis/ASGI-сервера runtime не проверялся.

---

## 1. Слои / архитектура (§R3.1)
- **Guard слоёв (`test_layering`) зелёный.** `api` не импортирует `app.db`/`app.models`/
  `app.repositories`/`sqlalchemy`: инфраструктуру достаёт **через сервис** (`HealthService`),
  lifespan делегирует в `services/lifecycle`, иерархия ошибок — в нейтральном `app/core/errors.py`.
- Направление строго вниз: `api → services → (db/redis)`; `services` не импортируют `fastapi`/`app.api`.
- Middleware/schemas/core — неограниченные инфраслои, импортируются корректно.

## 2. Соответствие 12 доп. требованиям владельца
| # | Требование | Статус |
|---|---|---|
| 1 | Factory, без глобального singleton | ✅ `create_app`; всё внутри фабрики; экземпляры изолированы (тест) |
| 2 | Единый lifespan, ленивая инициализация | ✅ нет соединений на импорте; teardown только если создан |
| 3 | DI, без глобальных сервисов, override | ✅ `Depends`; `dependency_overrides` проверены |
| 4 | Роуты: вход→сервис→ответ | ✅ health делегирует `HealthService`; логики нет |
| 5 | Все ошибки → Error Schema | ✅ AppError/validation/HTTPException/unexpected; 500 маскируется |
| 6 | Middleware однозадачны, явный порядок | ✅ RequestId/Logging/CORS/GZip; порядок в тесте |
| 7 | request_id в каждом логе | ✅ ContextVar + `request.state`; logging middleware |
| 8 | Health/Readiness раздельно, расширяемо | ✅ инъектируемые probe — реальные PG/Redis без изменения API |
| 9 | Background только seam; домен — очередь | ✅ `run_after_response` + граница §R10.1 |
| 10 | Пагинация общая, не по сущностям | ✅ `PageParams`/`CursorParams` + `Page[T]` |
| 11 | OpenAPI: генерация/warnings/opId/response_model | ✅ 0 предупреждений; уникальные opId; Error Schema в components |
| 12 | Runtime не имитировать; три статуса | ✅ RV-9; integration gated |

## 3. Типизация / стиль
- `mypy --strict` — **0 ошибок (144 файла)**, **0 `type: ignore`** (обработчики ошибок типизированы
  базовым `Exception` + narrowing — регистрация без ignore; DI через `Annotated`).
- `ruff check`/`format` — All checks passed; **B008 устранён** `Annotated[...]`-формой Depends/Query.
- `from __future__ import annotations` везде; файлы малые; функции короткие; `print` отсутствует.

## 4. Корректность (ключевые точки)
- **Request-ID доступен всем обработчикам**, включая внешний 500: id в `request.state` переживает
  сброс ContextVar; error-хендлеры читают `resolve_request_id`.
- **Ни одно исключение не утекает необработанным:** зарегистрированы AppError, RequestValidationError,
  `StarletteHTTPException` (404/405/…) и catch-all `Exception`; внутренние сообщения не раскрываются.
- **Readiness — инъектируемые probe:** 200 только когда все здоровы; probe не бросают (mis-config →
  `healthy=False`); реальные connect (SELECT 1 / PING) — RV-9.
- **Lifespan ленив:** engine/redis создаются по требованию; shutdown диспозит только `currsize>0` —
  импорт/старт не открывает соединений.
- **Middleware независимы:** request-id (только id), logging (только запись), CORS/GZip — встроенные;
  порядок фиксирован фабрикой (список outermost-first).
- **Пагинация:** limit>100 / offset<0 → 422; `Page[T]` обобщён (тест на двух типах).

## 5. Тесты / покрытие
- **37 offline-тестов** + 1 gated integration (RV-9). Всего в проекте **167 passed / 6 skipped**.
- coverage API: app/auth/background/deps/lifespan/pagination/router/health-route **100%**, errors 94%
  (недостижимые defensive-ветки isinstance), middleware 96–100%, schemas 100%; services health 67% /
  lifecycle 87% (непокрытое — реальные connect/dispose, RV-9); main.py — entrypoint (RV-9).

## 6. Наблюдения / риски
| # | Наблюдение | Severity | Примечание |
|---|---|---|---|
| A | **API-runtime не проверен** (readiness к PG/Redis, uvicorn, lifespan-соединения) | 🟠 | RV Pending → backlog RV-9 |
| B | Ресурсные роуты — каркас (нет сервисов) | 🟢 | по плану; health — эталон тонкого роута |
| C | Auth — только seam (нет enforcement) | 🟡 | явно помечено; ни один endpoint не полагается; RBAC — auth-этап |
| D | `BackgroundTasks` как «второй async-путь» | 🟢 | граница §R10.1 в коде/доке; домен — очередь |
| E | JSON-логгер отложен (stdlib) | 🟢 | точка интеграции; backlog FA-4 |

## 7. Технический долг
Нет. `print` отсутствует; логирование через интерфейс. Магии/дублирования нет (константы —
именованы; коды ошибок — карта). Секретов в коде нет; ошибки не раскрывают внутренности.

## 8. Трассируемость
§R3.5/R3.1/R10.1/R10.4/R10.5/R12.10/R2.6/R4.2 + API_SPEC — Implemented + Statically Verified;
API-runtime — Pending (RV-9). См. `TRACEABILITY_STAGE2.md` (Этап 10, требования 70–80).

## 9. Вердикт
**Этап 10 — чисто (offline).** HTTP-фундамент соответствует §R3.5/R3.1/R10.1/R12.10 и всем 12 доп.
требованиям; строго типизирован (0 ignore); тонкие роуты; единая Error Schema; OpenAPI без
предупреждений; guard слоёв зелёный. Долга нет. **API-runtime не подтверждён (нет сервисов)**,
вынесен в RV-9. Готов к Этапу 11 после подтверждения.
