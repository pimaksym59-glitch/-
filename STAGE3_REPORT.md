# STAGE3_REPORT.md — Этап 3: Docker & Compose

**Этап:** §R13.1 шаг 3 — Docker. **Дата:** 2026-07-22. **Статус:** завершён (со задокументированным
ограничением верификации), ждёт подтверждения. **План:** `TASK_BREAKDOWN_STAGE3.md` (утверждён).

---

## ⚠️ Ограничение верификации (Docker Engine недоступен)

В текущей среде **Docker CLI не найден, демон недоступен** (`docker: command not found`). По прямому
указанию владельца:
- **не имитировал** `docker build` / `docker compose up`;
- выполнил **максимально возможную статическую проверку**;
- **не отмечаю** требования, требующие реального запуска контейнеров, как полностью верифицированные.

**Что НЕ выполнено (требует Docker):** `docker build`, `docker compose config` (нет CLI), запуск
инфраструктуры, проверка healthcheck'ов, `python -m app doctor` **внутри контейнера**, фактическая
установка полного стека на 3.13 (gate OR-6).

## 1. Выполненные задачи

| Задача | Итог |
|---|---|
| T3.0 `.dockerignore` | ✅ минимальный контекст; `.env`/секреты/legacy/tests исключены (README.md сохранён для метаданных) |
| T3.1 `docker/Dockerfile` | ✅ multi-stage, `python:3.13-slim`, non-root (`appuser` uid 10001), один образ для всех ролей, HEALTHCHECK (doctor), writable `/app/storage` |
| T3.2 `docker/postgres/init.sql` | ✅ `CREATE EXTENSION vector; pg_trgm` (§R4.1) |
| T3.3 `docker/Caddyfile` | ✅ reverse proxy на `api:8000`, security-заголовки; прод-TLS → §R12.5/Этап 12 |
| T3.4 `docker-compose.yml` | ✅ postgres(pgvector)/redis/caddy + api/scheduler/worker (один образ, профиль `app`) |
| T3.5 env/секреты | ✅ всё через `environment`; `APP_ENV` задан (OR-1); секреты не в образ (OR-3); storage — named volume (OR-2) |
| T3.6 верификация + README | ⚠️ статически (см. ниже); README — секция Docker |
| T3.7 отчёты + тег | ✅ (этот отчёт + аудит + release notes; тег `stage-3-docker`) |

## 2. Соответствие доп. требованиям владельца

| Требование | Статус |
|---|---|
| Один Dockerfile для всех ролей | ✅ (роль = `command`, §R12.3) |
| Non-root пользователь | ✅ `USER appuser` |
| Multi-stage build | ✅ builder → runtime |
| Корректные HEALTHCHECK где уместно | ✅ postgres (`pg_isready`), redis (`redis-cli ping`), образ (doctor); app-readiness — этапы 10/12 |
| Именованный volume для PostgreSQL | ✅ `pgdata` |
| Секреты не в образе | ✅ только `environment`; `.dockerignore` исключает `.env` |
| Настройки только через environment | ✅ compose `environment:` |
| Compose готов к будущим этапам без арх. изменений | ✅ профиль `app`, реальные команды ролей закомментированы этапами |

## 3. Верификация (фактически выполненная, статическая)

| Проверка | Результат |
|---|---|
| `docker-compose.yml` — YAML корректен (PyYAML, merge-ключи) | ✅ 6 сервисов; app-роли наследуют `x-app`; профиль `app` |
| Только `caddy` публикует порты (least exposure §R12.5) | ✅ подтверждено скриптом |
| Инфра-healthcheck'и (postgres/redis) присутствуют | ✅ |
| Named volumes (`pgdata` и др.) / сети (`internal`/`public`) | ✅ |
| Dockerfile: multi-stage / non-root / HEALTHCHECK | ✅ (grep-проверки) |
| Хостовый toolchain без регрессий | ✅ `ruff` ok · `mypy` 0 issues (31) · `pytest` **23 passed** |
| `python -m app doctor` (хост) | ✅ exit 0 |

> Замечание: `yaml.safe_load` валидирует **синтаксис YAML и merge-ключи**, но это **не** эквивалент
> `docker compose config` (проверка по compose-схеме), который без Docker CLI недоступен.

## 4. Созданные/изменённые файлы

Новые: `.dockerignore`, `docker/Dockerfile`, `docker/postgres/init.sql`, `docker/Caddyfile`,
`docker-compose.yml`. Изменены: `.env.example` (compose-переменные), `README.md` (секция Docker).
Код `app/` **не менялся**.

## 5. Технический долг

Явного долга нет. Осознанные пункты обновлены в `TECHNICAL_BACKLOG.md` (OR-1/2/3 — mitigated в
конфиге; **OR-6 остаётся открытым — не проверено без `docker build`**; app-readiness healthchecks —
этапы 10/12; `uv.lock` — §R12.13).

## 6. Итог

Артефакты контейнеризации созданы согласно §R12.3–R12.5/§R4.1 и доп. требованиям; статически
корректны; хост-toolchain зелёный. **Runtime-верификация (build/up/healthcheck/doctor-in-container)
НЕ выполнена из-за отсутствия Docker Engine и явно не засчитана.** Переход к Этапу 4 — только по
отдельной команде.
