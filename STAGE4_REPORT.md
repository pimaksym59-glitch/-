# STAGE4_REPORT.md — Этап 4: PostgreSQL / Persistence Layer

**Этап:** §R13.1 шаги 4+6+7 (инфра БД + модели + репозитории). **Дата:** 2026-07-22. **Статус:**
завершён (с задокументированным DB-runtime ограничением), ждёт подтверждения. **План:** утверждён.

---

## ⚠️ Ограничение верификации (нет живого PostgreSQL)

Живой БД в среде нет. По решению владельца: **не имитировал** применение миграций/запросов.
- **Offline проверено:** сборка `Base.metadata` (25 таблиц), мапперы (`configure_mappers`),
  UUIDv7-дефолт, размерности векторов, индексы/constraints в metadata, wiring репозиториев,
  валидность Alembic-конфига и цепочки ревизий.
- **Runtime Verification Pending:** `alembic upgrade head`, реальные CRUD-запросы, pgvector/HNSW,
  partial-unique/GIN/FTS в работе, optimistic lock на данных. Интеграционный тест написан и
  **корректно пропускается** без `RUN_INTEGRATION=1`+БД (не засчитан).

## 1. Gate T4.0 — ✅ PASS
DB-стек ставится и импортируется на Python 3.14.6: `sqlalchemy 2.0.51`, **`asyncpg 0.31.0`
(cp314-wheel)**, `pgvector 0.5.0`, `alembic 1.18.5`, `greenlet 3.5.3`, `uuid6 2025.0.1`.
`uuid7()` даёт валидный v7.

## 2. Реализовано

- **Инфра БД** (`app/db/`): `base.py` (DeclarativeBase + MetaData с naming_convention), `session.py`
  (async engine/`async_sessionmaker`/`get_session`, ленивые), `types.py` (UUIDv7-дефолт, dims).
- **Модели** (`app/models/`, 10 файлов, **25 таблиц**): `Entity` (UUIDv7 PK, timestamps, soft
  delete, optimistic `version` через `version_id_col`) и `Record` (append-only). Кластеры:
  channel(5)/content(6)/image(2)/queue(1)/memory(1)/knowledge(2)/analytics(5)/user(3). **8 enums**
  (общие объекты — один CREATE TYPE на тип). persona≠actor (§R4.7).
- **pgvector** (§R4.5/R4.6): `memory`/`document_chunks` `vector(1536)`, `images`/`actors.face`
  `vector(512)`; **HNSW** (cosine) индексы.
- **Индексы/FK/constraints** (§R4.14): partial-unique `WHERE deleted_at IS NULL`, GIN(jsonb),
  FTS(`to_tsvector`), btree на FK/status/…, очередь `tasks` (dispatch partial index, dedup/slot unique).
- **Репозитории** (`app/repositories/`, §R3.1): `BaseRepository`/`EntityRepository` (PEP 695
  generics) + `channel/post/image/memory/task` — **без бизнес-логики, без commit** (транзакцией
  владеет вызывающий, §R4.11); channel-scoped хелперы (изоляция §R9.2); `claim_pending` (FOR UPDATE
  SKIP LOCKED, §R8.10).
- **Alembic** (§R12.6): async `env.py` (URL из settings), `script.py.mako`, `versions/0001_initial`
  (extensions → enums → таблицы через `Base.metadata` для гарантии соответствия моделям).
- **UUIDv7** (§R4.3): библиотека `uuid6` (решение владельца), во всех PK через `Entity`/`Record`.

## 3. Верификация (offline)

| Проверка | Результат |
|---|---|
| `ruff format`/`check` | All checks passed |
| `mypy --strict` | Success: 57 files (migrations исключены — динамический alembic) |
| `pytest` | **40 passed, 1 skipped** (integration, gated) |
| coverage | models/db **100%**; репозитории 63–77% (тела async-запросов — только интеграционно) |
| `alembic history`/`heads` | `<base> → 0001 (head)`; ревизия импортируется |
| `configure_mappers()` | 25 таблиц, мапперы ок |

## 4. Созданные/изменённые файлы
`pyproject.toml` (+`uuid6`, mypy exclude migrations); `app/db/{base,session,types}.py`;
`app/models/{enums,base,channel,content,image,queue,memory,knowledge,analytics,user}.py` + `__init__`;
`alembic.ini`, `app/db/migrations/{env.py,script.py.mako,versions/0001_initial.py}`;
`app/repositories/{base,channel_repository,post_repository,image_repository,memory_repository,task_repository}.py`;
`tests/db/*`, `tests/repositories/*`; `README.md`.

## 5. Технический долг
Явного долга нет. Осознанные пункты в `TECHNICAL_BACKLOG.md`: ADR-C2 **закрыт** (uuid6);
initial-миграция через `create_all` (baseline; далее autogenerate) — задокументировано; DB-runtime
и покрытие async-запросов — RV/TG (см. backlog).

## 6. Границы (не делано)
Сервисный слой — нет (только persistence). Реальные подключения/миграции — нет (RV Pending). Redis
(§R13.1 шаг 5) — следующий этап.

## 7. Итог
Полный слой персистентности реализован: 25 таблиц (SQLAlchemy 2 async, UUIDv7, pgvector, soft
delete + optimistic lock), Alembic готов к применению, репозитории без бизнес-логики. Offline —
зелёно. DB-runtime-верификация отложена (нет Postgres) и не засчитана. **Этап 5 — по отдельной команде.**
