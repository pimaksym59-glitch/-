# TECHNICAL_BACKLOG.md

**Дата:** 2026-07-22 · **Источник:** ARCHITECTURE_AUDIT_STAGE2 (N1–N5, F1–F7), CODE_AUDIT_STAGE2,
DOCUMENT_AUDIT_V2. **Режим:** только фиксация. Все пункты **Deferred** — не реализуются вне своего
этапа. Приоритет: P1 (высокий) / P2 (средний) / P3 (низкий).

---

## 1. Deferred Improvements (неблокирующие технические улучшения)

| ID | Описание | Причина | Этап | Приоритет | Статус |
|---|---|---|---|---|---|
| DI-1 | Задать `__all__` для публичного API модулей (`app.core.config`, `app.__main__`) | сейчас public API неявный (N4); по мере роста — риск случайных экспортов | по мере роста (3+) | P3 | Deferred |
| DI-2 | Единый источник дефолтов §Appendix B (код ↔ `config/global.yaml` ↔ MASTER_SPEC) | дублирование значений → риск рассинхрона (N5/F7) | все этапы | P2 | Deferred |
| DI-3 | Убрать side-effect `storage_dir.mkdir` из загрузки конфига (вынести в явную инициализацию) | конфиг-загрузка не должна мутировать ФС (N1); чистота + совместимость с read-only | 3 / 12 | P2 | Deferred |

## 2. Future Architecture Work (только на конкретных этапах)

| ID | Описание | Причина | Этап | Приоритет | Статус |
|---|---|---|---|---|---|
| FA-1 | Слой БД(канал)-оверрайда как высший business-config источник (§R3.4) | сейчас только зарезервировано место | 6–7 | P1 | Deferred |
| FA-2 | Выбор фейка провайдера при `secret is None` (§R2.10) | контракт задекларирован, не реализован (F6) | 11 | P1 | **✅ Implemented (Stage 11: `ProviderFactory` — real-if-key-else-fake; отсутствие ключа не бросает исключений)** |
| FA-3 | Правило приоритета `telegram_bot_token` (платформенный) vs per-channel `bot_token_ref` (БД) | конфликт двух источников токена (F5) | 7 / 16 | P2 | Deferred |
| FA-4 | Структурированный JSON-логгер + маскирование секретов (§R12.9) | конфиг хранит только `log_level`; логгера нет | этап логирования | P2 | Deferred |
| FA-5 | Распределённый rate-limiter (Redis token-bucket, §R7.6/§R8.9) | in-process семафор не масштабируется на N воркеров | 5 (код) / 8/12 (интеграция) | P1 | **Implemented in code (Stage 5, `app/core/redis/rate_limiter.py`)**; runtime — RV-6; **точка интеграции провайдеров — Stage 11 (`resilience.py` seam)**; фактический вызов в telegram/llm — этапы 16/12 |

## 3. ADR Candidates (потенциально требуют нового ADR)

| ID | Описание | Причина | Этап | Приоритет | Статус |
|---|---|---|---|---|---|
| ADR-C1 | Фиксация версии Python (3.13 vs 3.14) | стек ставится и на 3.14 (T2.0/T4.0), и в образе на 3.13; смена floor = архитектурное решение | 4 / 16 | P1 (условный) | Deferred (полный стек OK на 3.14) |
| ADR-C2 | Провайдер UUIDv7 | ~~stdlib 3.14 vs backport для 3.13~~ | 4 | P2 | **✅ Closed (Stage 4: библиотека `uuid6`, решение владельца)** |
| ADR-C3 | Включение MTProto stats-адаптера (O-1) | ADR-001 `Proposed`; решение за владельцем | 11 | P2 (owner) | Deferred |
| ADR-C4 | Целевая среда развёртывания (O-2) | ADR-002 `Proposed`; решение за владельцем | 12 | P2 (owner) | Deferred |

## 4. Operational Risks (Docker / Deployment / Secrets / Runtime)

| ID | Описание | Причина | Этап | Приоритет | Статус |
|---|---|---|---|---|---|
| OR-1 | `APP_ENV` задавать как реальную env-переменную (не только в `.env`) | иначе `{env}.yaml` не выберется, будет `development` (F1/N2) | 3 | P2 | **Addressed (Stage 3: compose `environment.APP_ENV`)** |
| OR-2 | `storage_dir.mkdir` при загрузке может падать в read-only контейнере | side-effect ФС (F2/DI-3) | 3 / 12 | P2 | **Mitigated (Stage 3: writable `storage` volume + non-root owner)**; DI-3 (убрать side-effect) — Deferred |
| OR-3 | Прод-секреты через secret manager / Docker secrets, не plaintext `.env` (§R12.2) | требование прод-безопасности | 3 / 12 | P1 | **Partially addressed (Stage 3: секреты только env, не в образ)**; secret manager — Deferred (12) |
| OR-4 | `database_url` для asyncpg должен использовать схему `postgresql+asyncpg` | валидатор допускает и `postgresql` (F4) | 4 | P2 | Deferred (compose уже использует `+asyncpg`) |
| OR-5 | `get_settings()` кэширован (`lru_cache`) — на рантайме конфиг фиксируется | смена env после старта не подхватится (F3) | runtime / 4+ | P3 | Deferred |

> OR-6 и OR-7 (закрываются только при Docker Engine) **перенесены** в раздел
> **6. Runtime Verification Required** ниже (RV-1/RV-2).

## 5. Testing Gaps (желательно покрыть тестами)

| ID | Описание | Причина | Этап | Приоритет | Статус |
|---|---|---|---|---|---|
| TG-1 | Тест `get_settings()` (аксессор + кэш) | не покрыт (N3, coverage line 205) | 2 follow-up | P3 | Deferred |
| TG-2 | Ассерт платформенных констант §R4.6 (`embedding_model/dim_text=1536/clip_dim=512`, не per-channel) | реализовано, но нет теста (см. TRACEABILITY) | 2 follow-up | P2 | Deferred |
| TG-3 | Полный ассерт дефолтов §Appendix B (сейчас проверены 4 из 10) | частичное покрытие (см. TRACEABILITY) | 2 follow-up | P2 | Deferred |
| TG-4 | Ветка ASCII-fallback в `_marks()` (кодировка stdout) | не покрыта (coverage 20-21) | 2 follow-up | P3 | Deferred |
| TG-5 | Doctor «всё сконфигурировано» (позитивный путь со всеми секретами) | покрыт только смешанный/пустой путь | 2 follow-up | P3 | Deferred |
| TG-6 | Тела async-запросов репозиториев покрыты **только** интеграционно | offline coverage репо 63–77% (§R4) | 4 (при БД) | P2 | Deferred |

## 6. Runtime Verification Required (закрывается ТОЛЬКО при доступности Docker Engine / живой БД)

Требуют реального Docker или живого PostgreSQL; в текущей среде выполнить нельзя. **Не** засчитываются как выполненные.

| ID | Описание | Причина | Этап | Приоритет | Статус |
|---|---|---|---|---|---|
| RV-1 | `docker build` успешен + **установка полного стека** (asyncpg/pgvector/aiogram/anthropic/openai/pillow) на `python:3.13-slim` | pydantic-стек OK на 3.14 (T2.0); полный стек не ставился (бывш. OR-6) | 3 (при Docker) / 4 / 16 | P1 | Pending Docker Engine |
| RV-2 | Нативная валидация: `docker compose config`, `caddy validate`; запуск инфры; healthcheck-переходы; `python -m app doctor` **в контейнере** | Docker недоступен → только статика (бывш. OR-7) | 3 (при Docker) | P2 | Pending Docker Engine |
| RV-3 | Runtime-подтверждение §R12.3/R12.4/R12.5/§R4.1 (pgvector/pg_trgm созданы; least-exposure действует; non-root действует) | требования отмечены Implemented+Statically Verified, но не Runtime Verified (TRACEABILITY 16–19) | 3 (при Docker) | P1 | Pending Docker Engine |
| RV-4 | `alembic upgrade head` на живом PostgreSQL (extensions/enums/25 таблиц/индексы) | initial-миграция авторская, не применялась (нет БД) | 4 (при БД) | P1 | Pending PostgreSQL |
| RV-5 | Реальные CRUD-запросы репозиториев + pgvector/HNSW/partial-unique/optimistic-lock | тела async-запросов исполнимы только против БД (§R4) | 4 (при БД) | P1 | Pending PostgreSQL |
| RV-6 | Redis-runtime: SET/GET/EXPIRE/EVAL(Lua)/SUBSCRIBE, атомарность token-bucket и lock safe-release, pub/sub-доставка, connection pool | тела async-методов исполнимы только против Redis (§R2.8/§R7.6) | 5 (при Redis) | P1 | Pending Redis |
| RV-7 | Queue-runtime: `FOR UPDATE SKIP LOCKED` claim, персистентность статусов, enqueue/dequeue, idempotency, конкуренция N воркеров, `python -m app.workers.run` | тела dispatcher/producer и entrypoint исполнимы только против PG+Redis (§R2.2/§R8) | 8 (при PG+Redis) | P1 | Pending PostgreSQL + Redis |
| RV-8 | Scheduler-runtime: `pg_try_advisory_lock`/`unlock`, чтение `schedules`+join channel, реальная материализация в `tasks` через Producer, идемпотентность (двойной тик не создаёт дубль — pre-filter + UNIQUE `dedup_key`), конкуренция N инстансов, `python -m app.scheduler.run` | тела advisory/repo/entrypoint исполнимы только против живого PostgreSQL (§R8.1/§R8.10) | 9 (при PostgreSQL) | P1 | Pending PostgreSQL |
| RV-9 | API-runtime: readiness-проба к живым PostgreSQL/Redis (`SELECT 1`/`PING`), запуск `uvicorn app.main:app` и обслуживание HTTP, lifespan против настоящих соединений (dispose/aclose), сквозной CORS/gzip «по проводу» | тела probe/lifespan и ASGI-сервер исполнимы только против живых сервисов (§R12.10/§R3.5) | 10 (при PG+Redis) | P1 | Pending PostgreSQL + Redis |
| RV-10 | Real-provider runtime: адаптеры вендоров (OpenAI/Anthropic/aiogram) + живые API-вызовы; фактическое поведение Retry/Timeout/Circuit-Breaker/rate-limit под нагрузкой; установка/импорт `anthropic/openai/aiogram` на 3.14 | Этап 11 = только абстракции + фейки (offline); реальные адаптеры/seam-политики появляются на этапах 12/15/16 | 12/15/16 (при внешних API) | P1 | Pending внешние API |

---

**Итого:** 3 Deferred Improvements · 5 Future Architecture Work (FA-2 **✅ implemented Stage 11**; FA-4
JSON-логгер — точка интеграции в Stage-10 middleware; FA-5 **implemented in code** + seam Stage 11) ·
4 ADR Candidates (ADR-C2 **closed**) · 5 Operational Risks · 6 Testing Gaps · **10 Runtime Verification
Required (RV-1…RV-10)**. Обновлено после Этапа 11: добавлен RV-10 (real-provider runtime, внешние API);
провайдер-абстракции + фейки — **полностью offline**, покрытие подсистемы ~98% (core-инфра/фейки/
composition 100%), `mypy --strict` без `type: ignore`. FA-2 закрыт. Ни один пункт не блокирует
следующий этап. Реализуются строго на указанных этапах и/или по команде владельца.
