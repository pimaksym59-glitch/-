# API_SPEC.md — Контракт REST API (`/api/v1`)

**Уровень:** 2 (реализация). **Реализует:** MASTER_SPEC §3(api-слой), §10(панель — клиент API),
§7/§8(операции через очередь). **Авторитет:** MASTER_SPEC. Новых требований не вводит.

---

## Общие правила

- **Транспорт:** HTTPS только (§R12.5), JSON. Base path `/api/v1`. Панель — клиент этих же
  эндпоинтов (§R10.1); отдельного пути публикации нет.
- **Слои:** роут → один use-case в `services` (§R3.1); без бизнес-логики и SQL в роутере.
- **Аутентификация:** сессионная cookie (HttpOnly, Secure, SameSite) после `/auth/login`;
  опц. MFA (§R10.4). Все эндпоинты кроме `/auth/*` и `/health/*` требуют сессии.
- **RBAC — на бэкенде** (§R10.5); проверка в `services`, не в UI. Матрица — ниже.
- **Изоляция каналов** (§R2.6): все запросы к канальным ресурсам скоупятся `channel_id`;
  доступ к чужому каналу → `403`.
- **Секреты write-only** (§R10.4): поля токенов/ключей принимаются на запись, в ответах —
  `null`/маска, никогда не возвращаются.
- **Пагинация:** `?limit=<=100&offset=` или cursor `?cursor=`; ответ `{items, total, next_cursor}`.
- **Идемпотентность мутаций-в-очередь:** заголовок `Idempotency-Key` → `dedup_key` (§R7.4).

### Формат ошибки (единый)
```json
{ "error": { "code": "string", "message": "string", "details": {}, "request_id": "uuid" } }
```
Коды HTTP: `200/201/202` успех · `400` валидация · `401` не аутентифицирован · `403` RBAC/isolation ·
`404` · `409` конфликт (в т.ч. optimistic-lock `version`, §R4.2) · `422` доменная валидация ·
`429` rate-limit · `500`. Мутации, ставящие задачу в очередь, возвращают **`202 Accepted`** с
`{task_id, status}` (§R10.1).

### RBAC-матрица (§R10.5)
| Область | owner | admin | editor | analyst | viewer |
|---|---|---|---|---|---|
| Channels/Settings CRUD | ✓ | ✓ | ро | ро | ро |
| Personas/Actors/KB/Prompts | ✓ | ✓ | ✓ | ро | ро |
| Content (create/regenerate/approve) | ✓ | ✓ | ✓ | – | – |
| Scheduler/Tasks (cancel/requeue/run) | ✓ | ✓ | – | – | – |
| Analytics/Cost (чтение) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Users/Roles, API keys, Security | ✓ | – | – | – | – |
| Audit log (чтение) | ✓ | ✓ | – | ✓ | – |

(«ро» = read-only.)

---

## Auth
- `POST /auth/login` `{email,password,otp?}` → `200 {user}` + cookie · `401`.
- `POST /auth/logout` → `204`.
- `GET  /auth/me` → `200 {user, role}`.
- `POST /auth/sessions/revoke` (owner) `{user_id}` → `204` (принудительное завершение, §R10.4).

## Channels (§R2.6, R3.3)
- `GET /channels` · `POST /channels` `{...profile}` → `201`.
- `GET|PATCH /channels/{id}` (PATCH требует `version` → `409` при рассинхроне).
- `POST /channels/{id}/pause` | `/resume` → `200` (status paused/active).
- `DELETE /channels/{id}` → soft delete `204` (§R4.4).
- `POST /channels/{id}/clone` · `GET /channels/{id}/export` · `POST /channels/import` (seed-формат §R3.3).
- `GET|PUT /channels/{id}/settings` (параметры §Appendix B; NULL = дефолт).
- **Секрет:** `PUT /channels/{id}/bot-token` (write-only, → secret store, §R12.2) → `204`.

## Personas / Actors / Locations
- `GET|POST /channels/{id}/personas` · `GET|PATCH /personas/{id}` · `POST /personas/{id}/archive`.
- `GET|POST /channels/{id}/actors` · `GET|PATCH /actors/{id}` ·
  `POST /actors/{id}/references` (upload референсов — вход генерации §R6.1).
- `GET|POST /channels/{id}/locations` · `GET|PATCH /locations/{id}`.

## Content / Posts (§R5, R7.8 — операции через очередь)
- `GET /channels/{id}/posts?status=` · `GET /posts/{id}` · `GET /posts/{id}/history` (§R7.9).
- `POST /channels/{id}/posts` (ручной черновик) → `201`.
- `POST /posts/{id}/generate` → `202 {task_id}` ставит `generate_text` (§R10.1).
- `POST /posts/{id}/regenerate` → `202` (`generate_text`/`generate_image`).
- `POST /posts/{id}/validate` → `202` (`validate`).
- `POST /posts/{id}/approve` | `/reject` (approval mode §R7.8) → `200`/`202`.
- `POST /posts/{id}/schedule` `{slot_datetime}` → `202` (создаёт слот/задачу с `run_at`, §R8.5).
- `POST /posts/{id}/publish` → `202` (`publish`; уважает лимиты §R7.6).
- `POST /posts/{id}/save-as-template` → `201`.

## Images (§R6)
- `GET /channels/{id}/images` · `GET /images/{id}` · `GET /images/{id}/history`.
- `POST /images/{id}/regenerate` → `202` (`generate_image`, ≤`IMAGE_MAX_REGEN`).
- `DELETE /images/{id}` → soft `204`. `GET /images/{id}/similarity` (phash/CLIP отчёт §R6.4).

## Knowledge Base (§R9.3)
- `GET|POST /documents` (upload → ingestion §R9.4) · `GET /documents/{id}` ·
  `PUT /documents/{id}` (новая версия §R9.10) · `GET /documents/{id}/versions` ·
  `POST /documents/{id}/reindex` → `202` (`reindex`) · `DELETE /documents/{id}` soft ·
  `POST /documents/{id}/assign` `{channel_id}`.

## Prompts (§R10.6 — версионируемые)
- `GET /prompts?type=` · `POST /prompts` (новая версия) · `GET /prompts/{id}/versions`.

## Scheduler & Tasks (§R8; owner/admin)
- `GET|POST /channels/{id}/schedules` · `PATCH /schedules/{id}`.
- `GET /tasks?status=&type=&channel_id=` (Task Monitor §R10.6; статусы §R4.11).
- `GET /tasks/{id}` · `POST /tasks/{id}/cancel` → `cancelled` · `POST /tasks/{id}/run` (ручной запуск) ·
  `POST /tasks/{id}/requeue` (DLQ `dead`→`pending`, §R8.11).

## Analytics & Cost (§R10.3, R11 — чтение всем ролям)
- `GET /analytics/channels/{id}?from=&to=` → метрики; **поля engagement помечены**
  `"availability":"available|gated"` (§R7.3); gated без адаптера → `null`+флаг, не выдуманные.
- `GET /analytics/reports/{daily|weekly|monthly}` · `GET /analytics/trends`.
- `GET /cost?group_by=channel|model|provider|day` (§R11.8, надёжный источник).
- `GET /analytics/quality` (quality/similarity/regen §R11.7).

## AI Studio (§R10.9 — изолирован)
- `POST /studio/dry-run` `{prompt|persona_id, model}` → генерация **без публикации и без записи в
  память**; ответ включает `cost` (§R10.9). `POST /studio/compare` `{models:[...]}`.

## Users & Security (owner)
- `GET|POST /users` · `PATCH /users/{id}` (role) · `GET /audit-log?entity=&actor=` (§R10.8) ·
  `GET /config-versions` · `POST /config-versions/{id}/rollback` (§R10.8).
- `GET|PUT /api-keys` (write-only, §R12.2) — значения не возвращаются.

## Health (§R12.10 — без auth)
- `GET /health/live` → `200` если процесс жив (**liveness**).
- `GET /health/ready` → `200`/`503` по доступности зависимостей (БД/Redis/провайдеры) (**readiness**).

---

## Трассировка → MASTER_SPEC
Панель-клиент/очередь §R10.1 · RBAC §R10.5 · изоляция §R2.6 · секреты write-only §R10.4/R12.2 ·
операции-в-очередь §R7/R8 · analytics-gated §R7.3/R10.3 · AI Studio изоляция §R10.9 · health
liveness≠readiness §R12.10 · optimistic lock §R4.2. Детальные JSON-схемы тел запросов/ответов
генерируются как OpenAPI из Pydantic-схем `app/schemas` на этапе реализации (§R13.1 шаг 10).
