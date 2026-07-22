# RELEASE NOTES — Stage 2 (Configuration)

**Project:** AI Telegram Automation Platform · **Version:** 0.1.0 · **Date:** 2026-07-22
**Architecture Freeze:** ACTIVE · **SoT:** `MASTER_SPEC.md` v2.0

---

## Что сделано

- **Единый типизированный загрузчик конфигурации** `app/core/config.py` (Pydantic Settings) с
  env-first приоритетом: `env vars > .env > config/*.yaml > code defaults` (CLI — зарезервировано).
- **Секреты — только из env/.env** (`SecretStr`, без дефолтов); yaml-источник физически исключает
  секретные поля (§R12.2). `.env.example` — шаблон имён.
- **Business config** — `config/global.yaml` + per-env `development/production.yaml` (несекретные
  дефолты §Appendix B).
- **Fail-fast валидация** — диапазоны/URL/enum/директории → `ValidationError` на старте.
- **Safe snapshot** — `Settings.to_safe_dict()` маскирует секреты (для логов).
- **Config Doctor** — `python -m app doctor`: статус конфига без сетевых подключений.
- **19 offline-тестов**; toolchain зелёный (ruff/mypy-strict/pytest 23/23); запускается.

## Что НАМЕРЕННО НЕ реализовано

`SELECT channel_settings`/Repository/SQLAlchemy, Redis-подключения, провайдеры, логгер, Docker,
сетевые проверки в doctor. Слой БД(канал)-приоритета — **только зарезервировано место** (Этапы 6–7).

## Решения этапа

- **env-first вместо yaml-first** (правка владельца): проще для Docker/K8s, секреты чётко отделены.
- **`pyyaml`** добавлен как формат business-config (§R3.4) — реализация, не архитектура (без ADR).
- **`enum.StrEnum`** для `AppEnv`/`LogLevel` (современная идиома, чистый линт).
- **Gate T2.0 пройден** — pydantic-стек ставится на Python 3.14; авто-смена Python не потребовалась.

## Открытые риски

| Риск | Уровень | Где решается |
|---|---|---|
| Остальной стек (asyncpg/pgvector/aiogram) на Python 3.14 ещё не проверен | 🟡 | Этапы 4 / 16 |
| Дублирование дефолтов §Appendix B (код ↔ yaml ↔ MASTER_SPEC) | 🟡 | согласованное редактирование; источник — §Appendix B |
| Слой БД(канал)-оверрайда пока отсутствует | 🟢 | Этапы 6–7 |

## Следующий этап

**Этап 3 — Docker** (§R13.1 шаг 3): Dockerfile (один образ, роли api/scheduler/worker, §R12.3),
`docker-compose.yml` (postgres+pgvector, redis, reverse proxy), healthchecks. Начинается **только
по отдельной команде**.
