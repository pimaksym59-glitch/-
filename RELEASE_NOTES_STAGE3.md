# RELEASE NOTES — Stage 3 (Docker & Compose)

**Project:** AI Telegram Automation Platform · **Version:** 0.1.0 · **Date:** 2026-07-22
**Architecture Freeze:** ACTIVE · **SoT:** `MASTER_SPEC.md` v2.0

---

## Что сделано

- **Один Dockerfile для всех ролей** (§R12.3): multi-stage, `python:3.13-slim`, non-root
  (`appuser`), HEALTHCHECK, writable `/app/storage`. Роль выбирается командой контейнера.
- **docker-compose.yml**: `postgres` (`pgvector/pgvector:pg16` + `init.sql`), `redis`, `caddy`
  (единственный edge с портами), и `api`/`scheduler`/`worker` из одного образа под профилем `app`
  (активируются на этапах 8–10 без архитектурных изменений).
- **pgvector + pg_trgm** включаются при инициализации БД (§R4.1).
- **Reverse proxy Caddy** (§R12.5): least exposure (наружу только proxy), security-заголовки;
  прод-TLS — Этап 12.
- **Секреты — только через environment**, никогда в образе (`.dockerignore` исключает `.env`).
  Именованные volume'ы для postgres/redis/storage.
- README — секция Docker; `.env.example` — compose-переменные (`POSTGRES_*`).

## ⚠️ Ограничение верификации

**Docker Engine недоступен** в текущей среде. По указанию владельца: без имитации build/up.
Выполнена только **статическая** проверка (YAML compose, структура, non-root/multi-stage/healthcheck,
least-exposure) + зелёный хост-toolchain. **Не выполнено и не засчитано:** `docker build`,
`docker compose up`, healthcheck-переходы, `python -m app doctor` в контейнере, реальная установка
полного стека на 3.13 (**OR-6 остаётся открытым**).

## Что НАМЕРЕННО НЕ реализовано

Entrypoints `app/main.py` / `app/scheduler/run.py` / `app/workers/run.py` (этапы 10/9/8) — сервисы
определены, но запускаются на своих этапах. Никакой бизнес-логики/миграций/подключений.

## Решения этапа

- База образа **`python:3.13-slim`** (решение владельца) — стабильные wheel'ы, снижает риск OR-6;
  floor `>=3.13` не меняется, dev-venv остаётся 3.14 (не ADR).
- App-роли под compose-профилем `app` — чистая готовность к будущим этапам.

## Открытые риски

| Риск | Уровень | Где решается |
|---|---|---|
| OR-6: полный стек на 3.13 не собран (нет Docker) | 🟠 | обязательный `docker build` при доступном Docker |
| Compose/Caddy не провалидированы нативно (`compose config`/`caddy validate`) | 🟡 | при доступном Docker |
| Невоспроизводимость сборки без lock-файла | 🟢 | `uv.lock` — §R12.13 / Этап 12 |
| app-readiness healthcheck'и | 🟡 | этапы 10/12 |

## Следующий этап

**Этап 4 — PostgreSQL (+pgvector)** (§R13.1 шаг 4): SQLAlchemy 2 async engine/session, Alembic,
`app/db/*`, базовая проверка подключения. Начинается **только по отдельной команде**.
