# CODE_AUDIT_STAGE5.md — Аудит качества кода Этапа 5 (Redis)

**Область:** `app/core/redis/*`, `tests/redis/*`. **Дата:** 2026-07-22. **Метод:** self-review +
ruff/mypy/pytest/coverage. **Ограничение:** без живого Redis динамика (I/O/Lua) не проверялась.

---

## 1. Слои / архитектура (§R3.1)
- Инфра-слой в `core`; не импортирует api/services/domain. Guard слоёв зелёный.
- Только инфраструктура: примитивы принимают клиент, не содержат доменных решений.

## 2. Соответствие особым требованиям владельца
| # | Требование | Статус |
|---|---|---|
| 1 | async-only (`redis.asyncio`) | ✅ |
| 2 | ключи только через KeyBuilder | ✅ (единственный модуль сборки; guard `:`-инъекции) |
| 3 | TTL в одном месте | ✅ `ttl.py`; тест «все TTL — положительные int» |
| 4 | нет магических строк | ✅ (namespaces enum; литералов ключей вне keys.py нет) |
| 5 | без бизнес-логики | ✅ (тонкие обёртки) |
| 6 | локи ≠ Postgres advisory | ✅ (docstring, отдельный механизм) |
| 7 | rate-limiter без Telegram/API-привязки | ✅ (rate/burst/key — параметры вызывающего) |
| 8 | idempotency — быстрый путь, БД источник истины | ✅ (docstring §R7.4) |
| 9 | pub/sub без доменных обработчиков | ✅ |
| 10 | runtime не имитируется, три статуса | ✅ (integration gated) |

## 3. Типизация / стиль
- `mypy --strict` — **0 ошибок (72 файла)**. `ruff` — All checks passed.
- Обходы типовых пробелов redis-py без `type: ignore`: pub/sub через async CM (`async with pubsub`),
  `Cache.get` типизирован `bytes | str | None`.

## 4. Безопасность / корректность
- `redis_url` — секрет только из env (§R12.2); `get_redis_manager` падает при отсутствии URL.
- Lock safe-release (Lua: DEL только при совпадении токена) — предотвращает снятие чужого лока.
- `decode_responses=False` — бинарная безопасность (векторы/произвольные payload).
- Ленивость: ни подключения на импорте/конструировании (тест `test_manager_is_lazy`).

## 5. Тесты / покрытие
- **13 offline-тестов** (keys/ttl/manager/primitives) + 2 gated integration.
- coverage: keys/ttl/**init** 100%; тела async-методов 59–82% — исполнимы только против Redis
  (integration, RV Pending). Логических offline-пробелов нет.

## 6. Наблюдения / риски
| # | Наблюдение | Severity | Примечание |
|---|---|---|---|
| A | **Redis-runtime не проверен** (I/O/Lua/pub-sub/pool) | 🟠 | RV Pending → backlog RV-6 |
| B | Корректность Lua (bucket/release) — только против Redis | 🟠 | статически: скрипты присутствуют; поведение — RV |
| C | TTL — константы; при необходимости вынести в config (как §Appendix B) | 🟢 | DI-подобно; сейчас достаточно |
| D | Покрытие тел async-методов — только integration | 🟢 | ожидаемо offline |

## 7. Технический долг
Нет TODO/FIXME/hardcode-секретов/`type: ignore`. Магических строк ключей/TTL-чисел вне
keys.py/ttl.py — нет.

## 8. Трассируемость
§R2.8/§R7.6/§R8.9 (rate-limiter), §R2-CACHE/§R9 (cache), §R7.4 (idempotency fast-path),
§R3.4/§R3.7 (config/no-magic), §R12.2 (secret) — Implemented + Statically Verified; Redis-runtime — Pending.

## 9. Вердикт
**Этап 5 — чисто (offline).** Инфра-слой Redis соответствует §R2.8/§R7.6/§R8.9/§R2-CACHE и всем 10
особым требованиям; строго типизирован; без бизнес-логики; зелёный toolchain. Долга нет.
**Redis-runtime не подтверждён (нет Redis)** и вынесен в RV. Готов к Этапу 6 после подтверждения.
