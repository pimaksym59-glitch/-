# CODE_AUDIT_STAGE3.md — Аудит артефактов Этапа 3 (Docker)

**Область:** `docker/Dockerfile`, `docker-compose.yml`, `docker/Caddyfile`,
`docker/postgres/init.sql`, `.dockerignore`, `.env.example`. **Дата:** 2026-07-22.
**Метод:** статический разбор (Docker Engine недоступен — см. ограничение).

---

## ⚠️ Ограничение
Динамический аудит (сборка образа, размер слоёв, реальный запуск, healthcheck-переходы) **не
проводился** — нет Docker Engine. Ниже — только статические выводы.

## 1. Dockerfile
| Критерий | Статус | Комментарий |
|---|---|---|
| Один образ для всех ролей (§R12.3) | ✅ | роль выбирается `command` в compose |
| Multi-stage | ✅ | builder (deps в `/opt/venv`) → slim runtime |
| Non-root (§R12.4) | ✅ | `appuser` uid 10001; `chown` перед `USER` |
| Минимальность | ✅ | `slim`; build-essential только в builder |
| Секреты не в образ | ✅ | секретов нет; `.dockerignore` исключает `.env` |
| HEALTHCHECK | ✅ | config-liveness (doctor); заметка: api/worker readiness — этапы 10/12 |
| Кэш-дружелюбность | 🟡 | `COPY pyproject+README` до `COPY app` — частичное кэширование; без lock (§R12.13) слой deps инвалидируется при любой правке pyproject |
| Discovery конфига | ✅ | runtime запускается из `/app` (source), `CONFIG_DIR=/app/config` резолвится корректно (cwd-приоритет `python -m app`) |

## 2. docker-compose.yml
| Критерий | Статус | Комментарий |
|---|---|---|
| Один образ, роли через `command` | ✅ | `x-app` anchor + `<<:` merge |
| App-роли не стартуют раньше времени | ✅ | профиль `app` (worker=8/scheduler=9/api=10) |
| Least exposure (§R12.5) | ✅ | порты публикует только `caddy`; проверено скриптом |
| Egress для внешних API сохранён | ✅ | `internal` — обычный bridge (исправлено: не `internal: true`) |
| Инфра-healthcheck'и | ✅ | postgres `pg_isready`, redis `ping`; `depends_on: service_healthy` |
| Named volumes | ✅ | `pgdata/redisdata/storage/caddydata/caddyconfig` |
| Секреты только env | ✅ | `POSTGRES_PASSWORD` обязателен (`:?`), в образ не попадает |
| APP_ENV как env (OR-1) | ✅ | задан в `environment` |
| Storage writable (OR-2) | ✅ | volume `storage:/app/storage`, non-root владелец |

## 3. Caddyfile
- `admin off`; security-заголовки; `reverse_proxy api:8000`. Валиден статически; `caddy validate`
  не запускался. Прод-TLS (домен/сертификаты) — §R12.5/Этап 12 (задокументировано).

## 4. init.sql
- Идемпотентно (`IF NOT EXISTS`), включает `vector` + `pg_trgm` (§R4.1). Выполняется только при
  пустом data-volume — корректно для named volume.

## 5. .dockerignore
- Исключает `.venv/.git/legacy/tests/docs/.env/кэши`; **сохраняет `README.md`** (нужен hatchling
  для метаданных). Контекст сборки минимален и без секретов.

## 6. Безопасность
Секретов в артефактах нет; non-root; least exposure; секреты только через env; `.env` в gitignore
и в `.dockerignore`. Замечаний нет (в пределах статики).

## 7. Наблюдения / риски
| # | Наблюдение | Severity | Примечание |
|---|---|---|---|
| A | **OR-6 не проверен** — полный стек не собирался (нет Docker) | 🟠 | первый реальный `docker build` — обязательный gate при доступном Docker |
| B | HEALTHCHECK образа = doctor; для `api` (uvicorn) это не readiness | 🟡 | сервис-специфичные healthcheck'и — этапы 10/12 |
| C | Нет lock-файла → сборка невоспроизводима по версиям (§R12.13) | 🟢 | `uv.lock` — Этап 12 (в бэклоге) |
| D | `caddy validate` / `compose config` не запускались | 🟡 | ограничение среды; выполнить при доступном Docker |

## 8. Технический долг
Явного долга нет. Пункты A–D — управляемые, отражены в `TECHNICAL_BACKLOG.md`.

## 9. Вердикт (в пределах статического аудита)

**PASS WITH NOTES (static-only).** Артефакты соответствуют §R12.3–R12.5/§R4.1 и доп. требованиям,
статически корректны, безопасны. **Runtime-соответствие НЕ подтверждено** (Docker недоступен) —
требует `docker build` + `compose up` + healthcheck + doctor-in-container при наличии Docker Engine.
