# STAGE5_REPORT.md — Этап 5: Redis Infrastructure

**Этап:** §R13.1 шаг 5. **Дата:** 2026-07-22. **Статус:** завершён (с DB/Redis-runtime ограничением),
ждёт подтверждения. **План:** утверждён (Pub/Sub в объёме).

---

## ⚠️ Ограничение верификации (нет живого Redis)

По требованию владельца — **не имитировал** runtime. Разделение статусов:
- **Implemented / Statically Verified (offline):** KeyBuilder (чистая логика), TTL-константы, ленивый
  RedisManager (без подключения), Lua-скрипты как строки, сигнатуры/типы, сериализация кэша,
  конструирование примитивов без сети.
- **Runtime Verification Pending:** реальные SET/GET/EXPIRE/EVAL/SUBSCRIBE, атомарность Lua
  (rate-limiter/локи), pub/sub-доставка, connection pool под нагрузкой. Интеграционные тесты
  написаны и **корректно пропускаются** без `RUN_INTEGRATION=1`+Redis (не засчитаны).

## 1. Gate T5.0 — ✅ PASS
`redis 8.0.1`, `redis.asyncio` (Redis/ConnectionPool/Lock) импортируется на Python 3.14.6.

## 2. Реализовано (`app/core/redis/`, только инфра)

| Модуль | Что |
|---|---|
| `manager.py` | **RedisManager** — singleton (ленивый), ConnectionPool, `is_configured` (без подключения), `ping` (явный health), `aclose` (graceful shutdown) |
| `keys.py` | **KeyBuilder** — единственное место сборки ключей; формат `tai:{env}:{namespace}:{parts}`; namespaces enum; запрет `:` в частях |
| `ttl.py` | все **TTL** в одном месте (константы, сек); никаких TTL-литералов в коде |
| `cache.py` | **Cache** — только `get/set/delete/exists/invalidate` (JSON), без предметной логики |
| `idempotency.py` | **IdempotencyStore** — `SET NX EX` быстрый путь; источник истины — Postgres `tasks.dedup_key` (§R7.4) |
| `rate_limiter.py` | **RateLimiter** — распределённый **token-bucket** через атомарный Lua; без привязки к Telegram/API (§R7.6/§R8.9) |
| `locks.py` | **DistributedLock** — `SET NX PX` + токен + Lua safe-release; **не** Postgres advisory (§R8.10) |
| `pubsub.py` | **Publisher/Subscriber** — инфра-примитив, каналы через KeyBuilder, без доменных обработчиков |

Особые требования владельца (1–10) — выполнены: async-only, ключи только через KeyBuilder, TTL в
одном месте, без магических строк/чисел, без бизнес-логики, локи ≠ advisory, лимитер без привязки,
идемпотентность = быстрый путь, pub/sub без обработчиков, runtime не имитируется.

## 3. Верификация (offline)

| Проверка | Результат |
|---|---|
| `ruff format`/`check` | All checks passed |
| `mypy --strict` | Success: 72 files |
| `pytest` | **49 passed, 3 skipped** (2 redis + 1 db integration, gated) |
| coverage `app.core.redis` | keys/ttl/**init** 100%; тела async-методов 59–82% (Redis I/O — только integration); TOTAL 77% |

## 4. Созданные/изменённые файлы
`app/core/redis/{__init__,manager,keys,ttl,cache,idempotency,rate_limiter,locks,pubsub}.py`;
`tests/redis/*`; `README.md` (секция Redis). `pyproject` — без изменений (`redis` уже объявлен).

## 5. Технический долг
Нет. Осознанные пункты — в backlog: FA-5 (rate-limiter реализован, runtime — RV); Redis-runtime (RV).

## 6. Границы (не делано)
Никакой бизнес-логики/доменных потребителей (что кэшировать, какие лимиты у Telegram — на своих
этапах). Реальные Redis-операции — RV Pending.

## 7. Итог
Инфраструктурный слой Redis реализован (async, KeyBuilder-only, TTL-only, локи/лимитер/идемпотентность/
кэш/pub-sub), строго типизирован, offline-зелёно. Redis-runtime не проверялся (нет Redis) и не
засчитан. **Этап 6 — по отдельной команде.**
