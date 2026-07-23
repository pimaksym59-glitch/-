# RELEASE NOTES — Stage 4 (PostgreSQL / Persistence Layer)

**Project:** AI Telegram Automation Platform · **Version:** 0.1.0 · **Date:** 2026-07-22
**Architecture Freeze:** ACTIVE · **SoT:** `MASTER_SPEC.md` v2.0

---

## Что сделано

- **Полная схема БД (25 таблиц)** из `DATABASE_SPEC.md`: SQLAlchemy 2.x async Declarative, единая
  `Base.metadata`. `Entity` (UUIDv7 PK, timestamps, soft delete, optimistic `version`) и `Record`
  (append-only). 8 native-enum типов (§R4.11-13).
- **UUIDv7** во всех PK через библиотеку **`uuid6`** (решение владельца, §R4.3).
- **pgvector**: `memory`/`document_chunks` `vector(1536)`, `images`/`actors.face` `vector(512)`;
  **HNSW** (cosine) индексы; partial-unique (soft delete), GIN(jsonb), FTS; очередь `tasks`
  (dispatch/ dedup/ slot-идемпотентность).
- **Репозитории** (`app/repositories`): базовые (PEP 695 generics) + channel/post/image/memory/task —
  **без бизнес-логики**, без commit (транзакцией владеет вызывающий, §R4.11).
- **Alembic** готов к реальному применению: async `env.py`, initial-миграция (extensions→enums→
  таблицы), конфиг валиден (`<base> → 0001 head`).
- **40 offline-тестов** + gated integration; toolchain зелёный (ruff/mypy-strict/pytest); coverage
  моделей 100%.

## ⚠️ Ограничение верификации (нет PostgreSQL)

Живой БД в среде нет → **применение миграций, запросы и pgvector-операции не проверялись**
(Runtime Verification Pending). Интеграционный тест написан, но не запускается без
`RUN_INTEGRATION=1`+БД и **не засчитан**.

## Решения этапа

- **`uuid6`** как UUIDv7-провайдер (закрывает ADR-C2; легко заменить на stdlib при поднятии floor).
- **Gate T4.0 пройден**: весь DB-стек (asyncpg cp314 и др.) ставится на Python 3.14.
- Initial-миграция через `Base.metadata.create_all` (baseline, parity с моделями); далее — обычный autogenerate.
- Общие enum-объекты (один `CREATE TYPE` на тип).

## Открытые риски

| Риск | Уровень | Где решается |
|---|---|---|
| DB-runtime (миграции/запросы/pgvector) не проверен | 🟠 | при доступной БД (RV-4/RV-5 в backlog) |
| `database_url` без `+asyncpg` (OR-4) | 🟡 | ужесточение валидатора позже |
| Покрытие тел async-запросов — только integration | 🟢 | `RUN_INTEGRATION=1` |

## Следующий этап

**Этап 5 — Redis** (§R13.1 шаг 5): async Redis-клиент из настроек (кэш + основа распределённого
rate-limiter §R7.6/§R8.9), провайдер-абстракция с фейком. Начинается **только по отдельной команде**.
