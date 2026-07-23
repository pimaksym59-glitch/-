# CODE_AUDIT_STAGE4.md — Аудит качества кода Этапа 4

**Область:** `app/db/*`, `app/models/*`, `app/repositories/*`, Alembic, `tests/db|repositories/*`.
**Дата:** 2026-07-22. **Метод:** self-review + ruff/mypy/pytest/coverage. **Ограничение:** без живой
БД динамика (DDL/запросы) не проверялась.

---

## 1. Clean Architecture / слои (§R3.1)
| Критерий | Статус |
|---|---|
| `models` — единый дом (§R3.2), регистрируются на одной `Base.metadata` | ✅ |
| `repositories` — только data-access, **без доменных правил и без commit** (§R3.1/§R4.11) | ✅ |
| `db` (инфра) не зависит от api/services | ✅ |
| Guard слоёв (`tests/test_layering.py`) | ✅ зелёный |

## 2. SQLAlchemy 2.x / типизация
- Declarative typed `Mapped[...]` на всех колонках; `mypy --strict` — **0 ошибок (57 файлов)**.
- `Entity` (mutable, optimistic `version_id_col`) vs `Record` (append-only) — чёткое разделение.
- PEP 695 generics в репозиториях (`BaseRepository[ModelT: Base]`), без `Generic/TypeVar`.
- Alembic-скрипты исключены из strict-mypy (динамический `alembic.context`/`op`) — стандартно.

## 3. Соответствие DATABASE_SPEC (§R4)
| Аспект | Статус |
|---|---|
| Все 25 таблиц | ✅ (`test_all_tables_registered`) |
| UUIDv7 PK (§R4.3) | ✅ через `uuid6`; тест v7 |
| Базовые колонки + soft delete + `version` (§R4.2/R4.4) | ✅; Record без них |
| persona≠actor (§R4.7) | ✅ (тест) |
| Векторы + размерности (§R4.5/R4.6) | ✅ (тест dims) |
| Индексы: partial-unique/GIN/FTS/HNSW; очередь (§R4.9/R4.14) | ✅ в metadata (тест очереди) |
| Enums (§R4.11-13), общий объект на тип | ✅ (нет двойного CREATE TYPE) |

## 4. Транзакции (§R4.11)
Репозитории принимают `AsyncSession`, **не коммитят**; UoW/границу держит вызывающий. Оптимистическая
блокировка — `version_id_col`. Пул — ленивый async engine (`pool_pre_ping`); pgbouncer — §R12/масштаб.

## 5. Тесты / покрытие
- **40 offline-тестов** (metadata/mappers/types/migration/repo-wiring) + 1 gated integration.
- coverage: models/db **100%**; репозитории 63–77% — непокрыты **тела async-запросов**, исполнимые
  только против БД (integration, RV Pending). Логических пробелов offline нет.

## 6. Технический долг / «магия»
Нет TODO/FIXME/hardcode-секретов/`type: ignore` (кроме исключённых миграций). SQL вручную не писан
(кроме `CREATE EXTENSION` в миграции — требуется). Дублирование dims (код `db/types` ↔ config) —
DI-2 в бэклоге.

## 7. Наблюдения / риски
| # | Наблюдение | Severity | Примечание |
|---|---|---|---|
| A | **DB-runtime не проверен** (миграции/запросы/pgvector) | 🟠 | RV Pending → backlog RV-4/RV-5 |
| B | initial-миграция через `Base.metadata.create_all` (baseline), не пооператорный autogenerate | 🟡 | гарантирует parity моделям; далее — обычный autogenerate; применение = RV |
| C | `database_url` допускает `postgresql` без `+asyncpg` (OR-4) | 🟡 | async engine требует `+asyncpg`; compose уже так; валидатор ужесточить позже |
| D | Покрытие тел async-запросов только integration | 🟢 | ожидаемо offline; закрывается `RUN_INTEGRATION=1` |
| E | Дублирование embedding-dims (config ↔ db/types) | 🟢 | DI-2 |

## 8. Трассируемость
§R4.1–R4.14, §R3.1 (репозитории), §R3.2 (модели), §R4.11 (транзакции), §R12.6 (Alembic) —
Implemented + Statically Verified; DB-runtime — Pending (см. TRACEABILITY).

## 9. Вердикт
**Этап 4 — чисто (offline).** Persistence layer соответствует DATABASE_SPEC/§R4, строго типизирован,
без бизнес-логики в репозиториях, зелёный toolchain, offline-покрытие моделей 100%. Технического
долга нет. **DB-runtime-соответствие не подтверждено (нет Postgres)** и явно вынесено в RV. Готов к
Этапу 5 после подтверждения владельца.
