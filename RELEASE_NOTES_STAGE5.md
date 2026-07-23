# RELEASE NOTES — Stage 5 (Redis Infrastructure)

**Project:** AI Telegram Automation Platform · **Version:** 0.1.0 · **Date:** 2026-07-22
**Architecture Freeze:** ACTIVE · **SoT:** `MASTER_SPEC.md` v2.0

---

## Что сделано

Инфраструктурный слой Redis в `app/core/redis` (async-only, **без бизнес-логики**):
- **RedisManager** — ленивый singleton, connection pool, `is_configured` (без подключения),
  `ping` (явный health), `aclose` (graceful shutdown).
- **KeyBuilder** — единственное место сборки ключей (`tai:{env}:{namespace}:{parts}`); namespaces
  enum; запрет магических строк.
- **TTL** — все в `ttl.py` (константы); никаких TTL-литералов в коде.
- **Cache** — `get/set/delete/exists/invalidate` (JSON), без предметной логики.
- **IdempotencyStore** — быстрый путь `SET NX`; источник истины — Postgres `tasks.dedup_key` (§R7.4).
- **RateLimiter** — распределённый token-bucket (атомарный Lua), §R7.6/§R8.9 (закрывает FA-5 по коду).
- **DistributedLock** — `SET NX` + Lua safe-release; **не** Postgres advisory (§R8.10).
- **Publisher/Subscriber** — pub/sub примитив без доменных обработчиков.

Toolchain зелёный: ruff, mypy-strict (72 файла), **pytest 49 passed / 3 skipped** (integration gated).

## ⚠️ Ограничение верификации (нет живого Redis)

Реальные Redis-операции (SET/GET, Lua, локи, rate-limiter, pub/sub, pool) **не проверялись** —
Runtime Verification Pending (backlog RV-6). Интеграционные тесты написаны, но не запускаются без
`RUN_INTEGRATION=1`+`REDIS_URL` и **не засчитаны**.

## Решения этапа
- Только `redis.asyncio` (redis 8.0.1); gate T5.0 пройден на Python 3.14.
- Локи и идемпотентность явно разграничены с Postgres-механизмами (advisory / `dedup_key`).
- Rate-limiter — чистая инфра (rate/burst/key задаёт вызывающий; без привязки к Telegram/API).

## Открытые риски
| Риск | Уровень | Где решается |
|---|---|---|
| Redis-runtime (I/O/Lua/pub-sub/pool) не проверен | 🟠 | при доступном Redis (RV-6) |
| Корректность Lua-скриптов — только против Redis | 🟠 | integration |
| Покрытие тел async-методов — только integration | 🟢 | `RUN_INTEGRATION=1` |

## Следующий этап
**Этап 6 — ORM models** уже выполнен в Этапе 4 (консолидация). Следующий по §R13.1 — **Этап 8
(Task queue + registry)** либо по указанию владельца. Начинается **только по отдельной команде**.
