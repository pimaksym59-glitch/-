# TASK_BREAKDOWN — Stage 4 (PostgreSQL / Persistence Layer)

**Требует утверждения перед реализацией.** Объём (по запросу владельца) консолидирует §R13.1 шаги
**4 (PostgreSQL) + 6 (ORM-модели) + 7 (репозитории)** — полный слой персистентности. Источник схемы —
**`DATABASE_SPEC.md`** (реализация §R4). Architecture Freeze ACTIVE; MASTER_SPEC — SoT.

> **Замечание по объёму:** это крупный этап (~25 таблиц + enums + миграция + репозитории). При
> желании его можно разбить (4a: инфра+enums+модели; 4b: миграция+репозитории+тесты). По умолчанию
> планирую как один этап, как указано.

---

## ⚠️ Ключевое ограничение среды (как в Этапе 3)

**Живого PostgreSQL нет** (Docker недоступен, локального PG нет). Поэтому:
- **Offline-проверяемо (Statically/Unit):** определения моделей, построение `Base.metadata`,
  конфигурация мапперов/связей, значения enums, генерация UUIDv7, индексы/constraints в metadata,
  сигнатуры и чистая логика репозиториев, валидность Alembic-конфига и импорт миграции.
- **Runtime Verification Pending (нужен Postgres):** `alembic upgrade head`, реальные CRUD-запросы,
  pgvector-операции (HNSW/косинус), partial-unique/GIN/FTS в работе, оптимистическая блокировка на
  живых данных. Интеграционные тесты пишутся, но **запускаются только за `RUN_INTEGRATION=1` при
  доступной БД** — в текущей среде не выполняются и **не засчитываются**.

---

## Решения к подтверждению

1. **UUIDv7-провайдер (§R4.3, ADR-C2).** stdlib `uuid.uuid7()` есть только на 3.14 (dev), а
   прод-таргет — 3.13. Предлагаю зависимость **`uuid6`** (pure-Python, даёт `uuid7()`, работает на
   3.13+ и 3.14) как генератор PK. Альтернатива — свой ~15-строчный генератор в `app/utils`
   (без зависимости, но своя реализация). Это реализация frozen-требования §R4.3, **не** смена
   архитектуры (ADR не требуется). **Прошу выбрать: `uuid6` (реком.) или собственный util.**
2. **Полная схема из DATABASE_SPEC (все ~25 таблиц) в этом этапе** — подтвердить (альтернатива:
   ядро сейчас, остальное позже).
3. **DB runtime-верификация = Pending** (нет Postgres) — подтвердить как приемлемо (как в Этапе 3).

---

## Новые зависимости

Уже объявлены в `pyproject`, но **не установлены** (ставятся в T4.0): `sqlalchemy>=2`, `alembic`,
`asyncpg`, `pgvector` (+ транзитивно `greenlet` для async SQLAlchemy). **Новая:** `uuid6` (п.1).
Dev — без изменений (интеграционные — за флагом; `pytest-postgresql` рассматривается позже, не сейчас).

---

## Структура PostgreSQL (из DATABASE_SPEC)

- **Расширения:** `vector`, `pg_trgm` (в initial-миграции `CREATE EXTENSION IF NOT EXISTS`, дублирует
  docker `init.sql` для не-Docker БД).
- **Enums:** `channel_status, post_status, task_type, task_status, user_role, memory_kind,
  severity_level, prompt_type` (§R4.11–13).
- **Таблицы (§R4.10):** channels, channel_settings, personas, actors, locations, posts,
  post_history, images, image_history, prompts, schedules, tasks, memory, topics, cta,
  analytics_snapshots, api_usage, image_usage, errors, logs, users, documents, document_chunks,
  audit_log, config_versions.
- **Векторные колонки (§R4.5/R4.6):** `memory.embedding vector(1536)`,
  `document_chunks.embedding vector(1536)`, `images.embedding vector(512)`,
  `actors.face_embedding vector(512)`.

---

## Последовательность задач

### T4.0 — DB-зависимости + gate 3.14 🔴
- Установить `sqlalchemy asyncpg pgvector alembic greenlet uuid6` в `.venv`; проверить импорт.
- **Критерий:** импорт всех OK на 3.14. **При отсутствии wheel (asyncpg/pgvector на cp314)** —
  **СТОП + отчёт + варианты; без авто-смены Python/ADR без подтверждения** (как T2.0/T3.1).
- Файлы: `pyproject.toml` (+`uuid6`).

### T4.1 — DB-инфраструктура (async)
- `app/db/base.py` — `DeclarativeBase` + `MetaData` с naming_convention (детерминированные имена
  индексов/FK для Alembic).
- `app/db/session.py` — async engine из `settings.database_url`, `async_sessionmaker`,
  `get_session()` (зависимость FastAPI на будущее). **Ленивое** создание, без подключения на импорте.
- `app/db/types.py` — UUIDv7-дефолт (из п.1), хелперы для `Vector`.
- **Критерий:** импорт/mypy/ruff чистые; engine конструируется из настроек без сетевого подключения.

### T4.2 — Enums + базовый миксин
- `app/models/enums.py` — все PG-enums (§R4.11–13).
- `app/models/base.py` — миксин базовых колонок (§R4.2): `id` UUIDv7 PK, `created_at`, `updated_at`,
  `deleted_at`, `version` (+ `__mapper_args__` version_id_col для оптимистической блокировки §R4.2).
- **Критерий:** enums/миксин типизированы; metadata собирается.

### T4.3 — Модели: каналы (channels, channel_settings, personas, actors, locations)
- §R4.7 (persona≠actor; `channel.tone/style` отсутствуют; `default_persona_id`); `actors.face_embedding vector(512)`.
- **Критерий:** связи корректны; partial-unique на естественных ключах (§R4.4); metadata собирается.

### T4.4 — Модели: контент (posts, post_history, topics, cta, prompts, schedules)
- `posts` FK на channel/persona/topic/cta/memory/image; статусы `post_status`; индексы
  `(channel_id,status)`, `(channel_id, published_at desc)`, FTS GIN на `body`.

### T4.5 — Модели: изображения (images, image_history)
- `images.embedding vector(512)`, `phash`, HNSW-индекс на embedding, `(channel_id, published_at desc)`.

### T4.6 — Модели: очередь/память/KB (tasks, memory, documents, document_chunks)
- `tasks` (§R4.9): enums, `dedup_key` partial-unique, `run_at`, `locked_by/at`, индекс разбора
  `(status, run_at, priority) WHERE status='pending'`, идемпотентность слота
  `UNIQUE(channel_id, schedule_id, slot_datetime)`.
- `memory.embedding vector(1536)` + HNSW; `document_chunks.embedding vector(1536)` + HNSW.

### T4.7 — Модели: аналитика/ops/пользователи
- `analytics_snapshots` (§R4.8, NULLABLE engagement), `api_usage`, `image_usage`, `errors`, `logs`,
  `users` (role enum), `audit_log`, `config_versions`.

### T4.8 — Индексы/constraints/FK (сводно, §R4.14)
- btree на FK/`status`/`published_at`/`run_at`; partial-unique `WHERE deleted_at IS NULL`; GIN на
  jsonb и FTS + `pg_trgm`; HNSW (косинус) на всех vector-колонках. Партиционирование (§R4.15) —
  **не** сейчас (документируется как future).
- **Критерий:** индексы/constraints присутствуют в `Base.metadata`; имена детерминированы (naming_convention).

### T4.9 — Alembic (async) + initial migration
- `app/db/migrations/env.py` (async), `script.py.mako`, `versions/0001_initial.py`.
- Initial: `CREATE EXTENSION` → enums → таблицы → индексы (initial = create, expand-contract §R12.6
  здесь не нужен). `alembic.ini` в корне (обновить target/script_location на `app/db/migrations`).
- **Критерий:** конфиг валиден, миграция импортируется; **`alembic upgrade head` = Runtime
  Verification Pending (нет Postgres)**.

### T4.10 — Репозитории (без бизнес-логики, §R3.1)
- `app/repositories/base.py` — дженерик async CRUD (`get/list/add/soft_delete`) над `AsyncSession`.
- `channel_repository.py`, `post_repository.py`, `image_repository.py`, `memory_repository.py`,
  `task_repository.py` — только data-access, **без доменных правил и без commit** (транзакцией
  владеет вызывающий — §R4.9/стратегия ниже). Изоляция канала (`WHERE channel_id`) как параметр
  запроса (§R9.2 — контракт, применяется на этапах RAG).
- **Критерий:** типизировано; нет бизнес-логики; методы, не требующие БД, юнит-тестируемы.

### T4.11 — Стратегия транзакций
- Unit-of-Work: `async with session.begin(): ...`; репозитории принимают `session`, **не** коммитят;
  границу транзакции держит сервис/вызывающий (сервисы — позже). Оптимистическая блокировка —
  `version` (§R4.2). Пул соединений — ограниченный async (pgbouncer — §R12/масштаб, не сейчас).
- **Критерий:** задокументировано в `app/db/` docstring + отражено в отчёте.

### T4.12 — Тесты
- **Offline (unit):** сборка `Base.metadata` (все таблицы/индексы присутствуют), значения enums,
  базовый миксин, **UUIDv7-дефолт даёт валидный v7** (версия/вариант), сигнатуры/чистая логика
  репозиториев (с фейковой/replaced сессией, без сети).
- **Integration (за `RUN_INTEGRATION=1`, не запускается здесь):** `alembic upgrade head`, CRUD,
  pgvector-поиск, partial-unique, optimistic lock — **Runtime Verification Pending**.
- **Критерий:** offline-тесты зелёные; интеграционные написаны и корректно пропускаются без флага/БД.

### T4.13 — Отчёты + закрытие
- `STAGE4_REPORT.md`, `CODE_AUDIT_STAGE4.md`, `RELEASE_NOTES_STAGE4.md`; **обновить**
  `TECHNICAL_BACKLOG.md` (RV — добавить БД-runtime; ADR-C2 закрыт выбором провайдера; OR-4 asyncpg-схема)
  и `TRACEABILITY_STAGE2.md` (строки §R4.* с тремя статусами). Серия коммитов + тег `stage-4-database`.
- **Критерий:** ruff/mypy-strict/pytest зелёные (offline); секреты не в git; тег на финале.

---

## Создаваемые/изменяемые файлы (сводно)

| Файл | Действие |
|---|---|
| `pyproject.toml` | +`uuid6` |
| `app/db/base.py`, `session.py`, `types.py` | новые — инфра |
| `app/models/enums.py`, `base.py`, `channel.py`, `content.py`, `image.py`, `queue.py`, `memory.py`, `knowledge.py`, `analytics.py`, `user.py` | новые — ORM (сгруппированы) |
| `app/db/migrations/env.py`, `script.py.mako`, `versions/0001_initial.py` | новые — Alembic |
| `alembic.ini` | новый (в корне) |
| `app/repositories/base.py` + 5 репо | новые — data-access |
| `tests/db/`, `tests/repositories/` | новые — offline + (gated) integration |
| `README.md` | edit — секция БД/миграции |
| `STAGE4_REPORT.md`, `CODE_AUDIT_STAGE4.md`, `RELEASE_NOTES_STAGE4.md` | новые |
| `TECHNICAL_BACKLOG.md`, `TRACEABILITY_STAGE2.md` | обновление (живые) |

## Граф зависимостей задач

`T4.0 → T4.1 → T4.2 → {T4.3, T4.4, T4.5, T4.6, T4.7} → T4.8 → T4.9 → T4.10 → T4.11 → T4.12 → T4.13`

---

## Реализуемые требования MASTER_SPEC

§R4.1 (PG16+pgvector, SQLAlchemy2 async, Alembic) · §R4.2 (базовые колонки, version) · §R4.3 (UUIDv7) ·
§R4.4 (soft delete + partial unique) · §R4.5 (вектор на владельце) · §R4.6 (размерности) ·
§R4.7 (persona≠actor) · §R4.8 (analytics_snapshots) · §R4.9 (tasks-схема) · §R4.10 (все таблицы) ·
§R4.11–13 (enums) · §R4.14 (индексы) · §R3.1 (репозитории — только data-access) · §R3.2 (модели —
единый дом) · §R12.6 (миграции через Alembic). §R4.15 (партиционирование) — задокументировано как future.

---

## Риски

| # | Риск | Уровень | Митигация |
|---|---|---|---|
| R1 | `asyncpg`/`pgvector` без wheel на Python 3.14 (dev) — gate T4.0 | 🟠 | при провале СТОП+отчёт+варианты; без авто-смены Python/ADR |
| R2 | **Нет живого Postgres** → миграции/запросы/pgvector не проверяемы | 🔴 | Runtime Verification Pending (документируется, не засчитывается); offline-тесты на metadata/mappers |
| R3 | UUIDv7-провайдер (новая зависимость + 3.13/3.14) | 🟡 | решение к подтверждению (п.1); `uuid6` работает на 3.13+ |
| R4 | Объём (25 таблиц + репо) — большой этап | 🟡 | группировка задач; опция дробления 4a/4b |
| R5 | pgvector/Enum/JSONB корректность только против Postgres | 🟠 | metadata-проверки offline; полное — RV Pending |
| R6 | Alembic async env + initial без автогенерации (нет БД) | 🟡 | initial-миграция авторская; апрув применения — RV Pending |
| R7 | Рассинхрон DATABASE_SPEC ↔ модели | 🟢 | DATABASE_SPEC — источник; сверка в аудите |

---

> **Стоп для утверждения.** К реализации приступаю только после подтверждения плана и решений
> (п.1 провайдер UUIDv7, п.2 полная схема, п.3 DB runtime = Pending). Без утверждения Этап 4 не начинаю.
