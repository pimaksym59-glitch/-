# TASK_BREAKDOWN — Stage 3 (Docker & Compose)

**Требует утверждения перед реализацией.** Цель (§R13.1 шаг 3): контейнеризация системы как
**модульного монолита — роли одного образа** (§R12.3), с инфраструктурой (postgres+pgvector, redis,
reverse proxy) и принципами контейнеров §R12.4/§R12.5. Реализуется **инфраструктура**, а не новая
бизнес-логика.

Правила (с Этапа 3): Architecture Freeze ACTIVE; MASTER_SPEC — SoT; изменения архитектуры только
через ADR; серия коммитов + один тег; обязательные отчёты + self-review + ruff + mypy + pytest;
`TECHNICAL_BACKLOG.md` и `TRACEABILITY_STAGE2.md` — **обновляются** (живые), не создаются заново.

---

## Реализуемые требования MASTER_SPEC

| Требование | Что покрывается на Этапе 3 |
|---|---|
| §R12.3 контейнеры = роли одного образа | один `Dockerfile`; сервисы `api/scheduler/worker` — команды одного образа |
| §R12.4 принципы контейнеров | non-root, минимальный slim-образ, healthcheck, graceful shutdown (заложить) |
| §R12.5 reverse proxy / HTTPS / least exposure | Caddy; наружу только proxy; postgres/redis/app — внутренняя сеть |
| §R4.1 PostgreSQL 16 + pgvector | образ `pgvector/pgvector:pg16` + `init.sql` (`vector`, `pg_trgm`) |
| §R1.3 стек (Docker/Compose) | `docker-compose.yml` |
| §R12.2 секреты (частично) | секреты через env/Docker secrets, не в образ (OR-3) |

Смягчаются operational-риски бэклога: **OR-1** (APP_ENV в `environment`), **OR-2** (writable storage
volume), **OR-3** (секреты не в образ), **OR-6** (полный стек ставится в образе на 3.13).

## Границы этапа (НЕ делать)

Не реализуются entrypoints `app/main.py` / `app/scheduler/run.py` / `app/workers/run.py` (этапы
8–10) — сервисы `api/scheduler/worker` **определяются**, но запускаемы будут на своих этапах.
Никакой бизнес-логики, миграций, реальных подключений в коде. TLS-прод-настройка — §R12.5/Этап 12.

---

## Решение к подтверждению

**База образа — `python:3.13-slim`** (не 3.14): стабильные бинарные wheel'ы для asyncpg/pgvector/
pillow/aiogram → снижает риск OR-6. Floor `>=3.13` **не меняется** (не архитектурное изменение, без
ADR); dev-venv остаётся 3.14. Прошу подтвердить выбор базы.

---

## Последовательность задач

### T3.0 — `.dockerignore` + подготовка
- **Файлы:** `.dockerignore`.
- **Действие:** исключить `.venv`, `.git`, `legacy/`, `__pycache__`, кэши, `tests/`(в рантайм-образ
  не нужны), `*.md`, `.env`.
- **Критерий:** контекст сборки минимален; `.env` и секреты не попадают в образ.

### T3.1 — Dockerfile (multi-stage, non-root) 🔴 gate OR-6
- **Файлы:** `docker/Dockerfile`.
- **Действие:** builder-stage ставит runtime-зависимости из `pyproject.toml`; runtime-stage —
  `python:3.13-slim`, non-root пользователь, копирование установленного окружения + `app/` + `config/`.
  `ENTRYPOINT`/`CMD` по умолчанию — `python -m app doctor` (валидный smoke сейчас).
- **Критерий:** `docker build` **успешен** (первый полный тест установки стека на 3.13);
  контейнер выполняет `python -m app doctor` → exit 0. **При провале установки стека — СТОП + отчёт
  + варианты; без авто-смены Python/ADR без подтверждения владельца** (как gate T2.0).

### T3.2 — Postgres init (pgvector / pg_trgm)
- **Файлы:** `docker/postgres/init.sql`.
- **Действие:** `CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS pg_trgm;`
- **Критерий:** при инициализации контейнера БД расширения создаются (§R4.1).

### T3.3 — Reverse proxy (Caddy)
- **Файлы:** `docker/Caddyfile`.
- **Действие:** проксирование на `api` (порт внутренний), security-заголовки; локально — внутренний
  TLS/HTTP. Наружу — только Caddy (§R12.5).
- **Критерий:** `caddy validate` конфиг корректен; прод-TLS помечен как §R12.5/Этап 12.

### T3.4 — docker-compose.yml
- **Файлы:** `docker-compose.yml`.
- **Действие:** сервисы:
  - `postgres` (`pgvector/pgvector:pg16`, volume, healthcheck `pg_isready`, init.sql, внутр. сеть);
  - `redis` (`redis:7-alpine`, healthcheck `redis-cli ping`, внутр. сеть);
  - `caddy` (`caddy:2-alpine`, единственный публикующий порты);
  - `api` / `scheduler` / `worker` — **один build (образ Dockerfile)**, разные `command`
    (`uvicorn app.main:app` / `python -m app.scheduler.run` / `python -m app.workers.run`),
    `depends_on` healthy postgres/redis, `environment` c `APP_ENV`, `DATABASE_URL`, `REDIS_URL`,
    секреты через env; storage — writable volume (OR-2). **Помечены: активируются на этапах 8–10.**
- **Критерий:** `docker compose config` валиден; инфра-сервисы (postgres/redis/caddy) поднимаются и
  healthy; app-сервисы определены корректно (полный запуск — на своих этапах).

### T3.5 — Env/секреты wiring
- **Файлы:** обновить `.env.example` (compose-переменные: `APP_ENV`, `DATABASE_URL`, `REDIS_URL`).
- **Действие:** `APP_ENV` задаётся в `environment` сервисов (OR-1); `DATABASE_URL`/`REDIS_URL` —
  под внутренние hostname'ы сети compose; секреты — только env, не в образ (OR-3).
- **Критерий:** `python -m app doctor` внутри compose показывает `env/postgres/redis configured`.

### T3.6 — Верификация + README
- **Действие:** `docker build`; smoke `python -m app doctor` в контейнере; `docker compose config`;
  при доступном демоне — `up` postgres/redis + проверка healthcheck. README — секция Docker.
  Хостовый toolchain (ruff/mypy/pytest) — прогон без регрессий (код app не менялся).
- **Критерий:** сборка/smoke/config зелёные (или, при отсутствии Docker-демона, — `compose config`
  + документированное ограничение); README актуален.

### T3.7 — Отчёты + закрытие
- **Файлы:** `STAGE3_REPORT.md`, `CODE_AUDIT_STAGE3.md`, `RELEASE_NOTES_STAGE3.md`; **обновить**
  `TECHNICAL_BACKLOG.md` (статусы OR-1/2/3/6) и `TRACEABILITY_STAGE2.md` (строки §R12.3–5, §R4.1).
- **Действие:** серия логических коммитов + тег `stage-3-docker`.
- **Критерий:** отчёты готовы; дерево чистое; тег на финальном коммите; секреты не в git/образ.

---

## Создаваемые/изменяемые файлы (сводно)

| Файл | Действие |
|---|---|
| `.dockerignore` | новый |
| `docker/Dockerfile` | новый — один образ, multi-stage, non-root |
| `docker/postgres/init.sql` | новый — pgvector + pg_trgm |
| `docker/Caddyfile` | новый — reverse proxy |
| `docker-compose.yml` | новый — postgres/redis/caddy + api/scheduler/worker |
| `.env.example` | edit — compose-переменные |
| `README.md` | edit — секция Docker |
| `STAGE3_REPORT.md`, `CODE_AUDIT_STAGE3.md`, `RELEASE_NOTES_STAGE3.md` | новые |
| `TECHNICAL_BACKLOG.md`, `TRACEABILITY_STAGE2.md` | обновление (живые) |

## Новые зависимости

Python — **нет**. Docker base images: `python:3.13-slim`, `pgvector/pgvector:pg16`,
`redis:7-alpine`, `caddy:2-alpine`.

## Граф зависимостей задач

`T3.0 → T3.1 → {T3.2, T3.3} → T3.4 → T3.5 → T3.6 → T3.7`

---

## Риски

| # | Риск | Уровень | Митигация |
|---|---|---|---|
| R1 | Docker-демон недоступен в dev-среде | 🟠 | верификация деградирует до `docker compose config` + Dockerfile-разбор; ограничение документируется в отчёте |
| R2 | Полный стек не встаёт в образе на 3.13 (OR-6, gate T3.1) | 🟠 | при провале — СТОП + отчёт + варианты; без авто-смены Python/ADR без подтверждения |
| R3 | Сервисы api/scheduler/worker не запускаемы (нет entrypoints) | 🟡 | явно помечены «активируются на этапах 8–10»; smoke — только doctor; compose остаётся валидным |
| R4 | `APP_ENV` только в `.env` не выбирает `{env}.yaml` (OR-1) | 🟢 | задаётся в `environment` сервисов |
| R5 | storage_dir mkdir в read-only контейнере (OR-2) | 🟢 | writable volume для storage |
| R6 | Caddy TLS: локально vs прод | 🟢 | локально внутренний TLS/HTTP; прод-TLS → §R12.5/Этап 12 |
| R7 | Воспроизводимость сборки без lock-файла (§R12.13) | 🟢 | pip из pyproject сейчас; `uv.lock` — §R12.13/Этап 12 (в бэклоге) |

---

> **Стоп для утверждения.** К реализации приступаю только после подтверждения плана (и решения по
> базовому образу `python:3.13-slim`). Этап 3 без утверждения не начинаю.
