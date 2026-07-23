# TASK_BREAKDOWN — Stage 5 (Redis Infrastructure)

**Требует утверждения перед реализацией.** Цель (§R13.1 шаг 5): **инфраструктурный слой Redis** —
async-клиент, ключи, TTL, кэш, идемпотентность, распределённый rate-limiter, локи, pub/sub.
**Только инфраструктура, никакой бизнес-логики.** Architecture Freeze ACTIVE; MASTER_SPEC — SoT.

---

## ⚠️ Ключевое ограничение среды

**Живого Redis нет.** По требованию владельца — не имитировать runtime. Разделяем статусы:
- **Implemented / Statically Verified (offline):** KeyBuilder (чистая логика), TTL-константы,
  ленивый RedisManager (без подключения на импорте), Lua-скрипты как строки, сигнатуры/типы,
  сериализация кэша.
- **Runtime Verification Pending (нужен живой Redis):** реальные SET/GET/EXPIRE/EVAL/SUBSCRIBE,
  атомарность Lua (rate-limiter/локи), pub/sub-доставка. Интеграционные тесты пишутся, но
  запускаются только за `RUN_INTEGRATION=1`+Redis и **не засчитываются**.

## Особые требования владельца (обязательны)

1. **async API** — только `redis.asyncio`. 2. Все ключи — **только через централизованный
KeyBuilder**. 3. Все **TTL — в константах/конфиге**. 4. **Никаких «магических строк»** для ключей.
5. Никакой бизнес-логики — только инфра Redis. 6. Без живого Redis — не имитировать; три статуса.

## Размещение (слой)

Пакет **`app/core/redis/`** (инфраструктура; §R3 помещает распределённый rate-limiter в `core`).
Не импортирует api/services/domain; используется ими на будущих этапах.

## Разграничения (во избежание конфликтов)

- **Redis-локи ≠ Postgres advisory lock (§R8.10):** advisory используется планировщиком для
  идемпотентной материализации слотов; Redis-локи — общая координация флота воркеров. Разные
  механизмы, разные задачи — фиксируется в docstring.
- **Redis-идемпотентность = быстрый путь**, источник истины — `tasks.dedup_key` в Postgres (§R7.4).
- **Rate-limiter** — реализация FA-5/§R7.6/§R8.9 (распределённый, вместо in-process семафора).

---

## Последовательность задач

### T5.0 — Redis dependency + gate 3.14 🔴
- Убедиться, что `redis` установлен в `.venv`; проверить импорт `redis.asyncio`.
- **Критерий:** `import redis; import redis.asyncio` OK на 3.14. При отсутствии wheel — **СТОП +
  отчёт + варианты; без авто-смены Python/ADR** (как T2.0/T3.1/T4.0).
- Файлы: `pyproject.toml` (redis уже объявлен; при необходимости уточнить версию).

### T5.1 — RedisManager + Connection Pool
- `app/core/redis/manager.py` — ленивый async-клиент из `settings.redis_url` поверх
  `redis.asyncio.ConnectionPool` (параметры: `max_connections`, `health_check_interval`,
  `socket_timeout`, `decode_responses=False` для бинарной безопасности). `get_redis()` (кэш),
  `aclose()` для lifecycle. **Без подключения на импорте.**
- **Критерий:** импорт без сети; клиент конструируется из настроек; типизировано; mypy/ruff чисто.

### T5.2 — KeyBuilder + Namespaces
- `app/core/redis/keys.py` — централизованный типизированный построитель. Формат:
  `tai:{app_env}:{namespace}:{...parts}` (изоляция окружений). Namespaces (enum/константы):
  `cache`, `lock`, `ratelimit`, `idem`, `pubsub`. Типизированные методы:
  `cache(...)`, `lock(name)`, `ratelimit(provider, scope)`, `idem(key)`, `channel(name)`.
  **Никаких строковых литералов ключей вне этого модуля.**
- **Критерий:** чистая логика, 100% unit-покрытие; запрет магических строк (проверка тестом/ревью).

### T5.3 — TTL Strategy
- `app/core/redis/ttl.py` — TTL как именованные константы (сек): `CACHE_DEFAULT`, `EMBEDDING`,
  `PROMPT`, `CHANNEL_SETTINGS`, `HISTORY`, `SIMILAR_POSTS`, `IDEMPOTENCY`, `LOCK_DEFAULT`,
  `RATELIMIT_WINDOW`. Значения — платформенные дефолты (могут позже уйти в config, как §Appendix B).
- **Критерий:** ни одного «магического» числа TTL в других модулях; все берут из `ttl.py`.

### T5.4 — Cache Layer
- `app/core/redis/cache.py` — обёртка `get/set/delete/exists` с namespace-ключами (KeyBuilder),
  TTL (ttl.py), JSON-сериализацией (+ сырые bytes для векторов). Типизированные хелперы; **без
  доменной логики** (что именно кэшировать — embeddings/prompts/settings/history — подключается на
  своих этапах 9/13).
- **Критерий:** сериализация round-trip (unit, без Redis); типы; TTL из констант.

### T5.5 — Idempotency Storage
- `app/core/redis/idempotency.py` — `try_acquire(key, ttl)` через `SET NX EX` (быстрый путь).
  Docstring: источник истины — Postgres `tasks.dedup_key` (§R7.4); Redis — оптимизация окна.
- **Критерий:** сигнатуры/типы; команда `SET NX` формируется корректно (unit на аргументах).

### T5.6 — Distributed Rate Limiter (§R7.6/§R8.9, FA-5)
- `app/core/redis/rate_limiter.py` — распределённый **token-bucket** через **атомарный Lua-скрипт**;
  ключ `ratelimit:{provider}:{scope}` (KeyBuilder). Метод `try_acquire(provider, scope, cost=1) ->
  bool` (+ параметры rate/burst из констант/конфига). Lua хранится как строка-константа.
- **Критерий:** Lua-скрипт присутствует и синтаксически оформлен; сигнатуры/типы; **атомарность/
  поведение — RV Pending**.

### T5.7 — Distributed Locks
- `app/core/redis/locks.py` — лок через `SET NX PX` + токен + **Lua safe-release** (сравнение
  токена). Async context manager `lock(name, timeout)`. Docstring: ≠ Postgres advisory (§R8.10).
- **Критерий:** реализован как CM; Lua-release присутствует; типы; **поведение — RV Pending**.

### T5.8 — Pub/Sub
- `app/core/redis/pubsub.py` — `publish(channel, message)` и `subscribe(channel)` (async iterator)
  через KeyBuilder-каналы. Инфра-примитив (доменные события — позже).
- **Критерий:** сигнатуры/типы; каналы через KeyBuilder; **доставка — RV Pending**.

### T5.9 — Tests
- **Offline (unit):** KeyBuilder (формат/namespaces/детерминизм), TTL-константы, менеджер
  (ленивость/типы), наличие Lua-скриптов, сериализация кэша, сигнатуры лимитера/локов/идемпотентности.
- **Integration (за `RUN_INTEGRATION=1`+`REDIS_URL`, не запускается здесь):** реальные
  set/get/ttl, rate-limit consume, lock acquire/release, pub/sub round-trip — **RV Pending**.
- **Критерий:** offline зелёные; интеграционные написаны и корректно skip без флага/Redis.

### T5.10 — Reports + закрытие
- `STAGE5_REPORT.md`, `CODE_AUDIT_STAGE5.md`, `RELEASE_NOTES_STAGE5.md`; **обновить**
  `TECHNICAL_BACKLOG.md` (FA-5 → in progress/closed по мере; +RV для Redis-runtime) и
  `TRACEABILITY_STAGE2.md` (строки §R2.8/§R7.6/§R8.9/§R2-CACHE — три статуса). README — секция Redis.
  Серия коммитов + тег `stage-5-redis`.
- **Критерий:** ruff/mypy-strict/pytest зелёные (offline); секреты не в git; тег на финале.

---

## Создаваемые/изменяемые файлы

| Файл | Действие |
|---|---|
| `pyproject.toml` | проверка/уточнение `redis` |
| `app/core/redis/__init__.py`, `manager.py`, `keys.py`, `ttl.py`, `cache.py`, `idempotency.py`, `rate_limiter.py`, `locks.py`, `pubsub.py` | новые — инфра Redis |
| `tests/redis/*` | новые — offline + gated integration |
| `README.md` | edit — секция Redis |
| `STAGE5_REPORT.md`, `CODE_AUDIT_STAGE5.md`, `RELEASE_NOTES_STAGE5.md` | новые |
| `TECHNICAL_BACKLOG.md`, `TRACEABILITY_STAGE2.md` | обновление (живые) |

## Новые зависимости
`redis` (уже объявлен в `pyproject`, async API встроен). Опциональный `hiredis` (ускорение) — **не**
добавляю без потребности. Иных нет.

## Граф зависимостей
`T5.0 → T5.1 → T5.2 → T5.3 → {T5.4, T5.5, T5.6, T5.7, T5.8} → T5.9 → T5.10`

## Реализуемые требования MASTER_SPEC
§R2.8 (распределённый rate-limiter — фундамент) · §R7.6/§R8.9 (пер-провайдерный распределённый
rate-limiter, вместо in-process семафора) · §R2 CACHE / §R9 (Redis-кэш: embeddings/prompts/settings/
history — примитив + ключи) · §R7.4 (идемпотентность — быстрый путь; источник истины — Postgres) ·
§R3.4/§R3.7 (конфиг, без «магии» — KeyBuilder/TTL) · §R12.2 (`redis_url`-секрет только env).
FA-5 из backlog — закрывается rate-limiter'ом (runtime-верификация — Pending).

## Риски

| # | Риск | Уровень | Митигация |
|---|---|---|---|
| R1 | **Нет живого Redis** → runtime не проверяем | 🔴 | Runtime Verification Pending; offline — KeyBuilder/TTL/типы/Lua-строки |
| R2 | `redis` не импортируется на 3.14 (gate T5.0) | 🟡 | при провале СТОП+отчёт+варианты; без авто-смены Python/ADR |
| R3 | Корректность Lua (rate-limiter/локи) — только против Redis | 🟠 | статически: скрипт присутствует/оформлен; поведение — RV |
| R4 | binary vs text (`decode_responses`) для векторов | 🟡 | `decode_responses=False`; кэш кодирует/декодирует явно |
| R5 | Redis-локи vs Postgres advisory (§R8.10) | 🟢 | разные роли, зафиксировано в docstring |
| R6 | Redis-идемпотентность vs `tasks.dedup_key` (§R7.4) | 🟢 | Redis — быстрый путь, Postgres — источник истины |
| R7 | Объём (много примитивов) | 🟡 | группировка; все — тонкие инфра-обёртки |

---

> **Стоп для утверждения.** К реализации приступаю только после подтверждения плана. Этап 5 без
> утверждения не начинаю.
