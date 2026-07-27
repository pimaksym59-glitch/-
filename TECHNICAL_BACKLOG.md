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
| RV-11 | AI-Engine runtime: генерация против **живых** LLM (Anthropic/OpenAI) — фактический model-routing/fallback/streaming/стоимость/латентность под реальными моделями | Этап 12 = движок offline на `FakeLLMProvider`; реальные модели — с адаптерами (наследует RV-10) | 12 (при живых LLM) | P1 | Pending живые LLM |
| RV-12 | RAG runtime: реальные **pgvector**-store'ы, живые embedding-вызовы, фактический semantic/keyword/hybrid-поиск + reranking под живыми PostgreSQL + embedding-API; keyword/hybrid(RRF)/cache/versioning/retention — расширения seam'ов | Этап 13 = kernel offline на фейках + `FakeEmbeddingProvider`; реальные бэкенды/поиск — с адаптерами | 13 (при PG+embeddings) | P1 | Pending PG + embeddings |
| RV-13 | Validation runtime: реальный **LLM-judge** (humanness §R5.8) и **vector-стадия dedup** (§R5.7 через Memory/RAG+embeddings) под живыми LLM/embedding-API; ML-валидаторы — расширения | Этап 14 = движок offline (rule-gates/trigram/stop-list) + фейк-порты; реальные judge/vector-dedup — через порты | 14 (при LLM+embeddings) | P1 | Pending LLM + embeddings |
| RV-14 | Image runtime: реальная генерация против живых image-провайдеров (Nano Banana/Flux/OpenAI/Ideogram), **identity-conditioning по референсам** (§R6.1), **CLIP/face-embedding-валидация** (§R6.4/R6.7); batch/streaming — расширения | Этап 15 = движок offline на `FakeImageProvider` + фейк-валидаторе (thumbnail/phash offline); реальные провайдеры/валидатор — через порты | 15 (при image-API) | P1 | Pending image-API |
| RV-15 | Telegram runtime: реальный **Bot API/aiogram** (send/receive), **webhook/polling**, distributed rate-limiter под нагрузкой (§R7.6), at-least-once-доставка (§R7.4); real Redis-`StateStore`/`RateLimiter`/`IdempotencyGuard`; multi-platform/MTProto — расширения | Этап 16 = движок offline на `FakeTelegramProvider` + фейк-source/state/rate/idempotency; реальные адаптеры — через порты | 16 (при Bot API) | P1 | Pending Bot API |
| RV-16 | Analytics/Observability runtime: реальный **экспорт telemetry** (OpenTelemetry span/Prometheus metrics), реальный **экспорт/персистентность событий и аудита** в PostgreSQL (`analytics_snapshots`/`api_usage`/`image_usage`/`logs`/`errors`/`audit_log`, наследует RV-9), сбор **engagement**-сигналов (§R7.3/§R11.3, наследует RV-15), внешние analytics-backends/audit-sinks; вычислительная аналитика §R11.4–R11.8 (bandit/experiments/report/forecast) — последующие стадии | Этап 17 = подсистема offline stdlib-only на детерминированных фейках (event/metrics/audit/tracing/export-seam'ы); реальные экспортёры/бэкенды — через порты и seam'ы (raise `NotImplementedError`) | 17 (при бэкендах/БД) | P1 | Pending telemetry/DB backends |
| RV-17 | Admin Panel runtime: реальный **Web UI (HTMX/HTTP)**/браузерные сценарии, cookie-сессия/CSRF по проводу, реальный **хэшер паролей/MFA/внешние SSO** (OAuth/OIDC/LDAP/SAML), **персистентность** (`users`/`audit_log`/`config_versions`/`prompts`/каналы/… → PostgreSQL, наследует RV-9), действия панели **через очередь** (наследует RV-7), живые Analytics/Providers/AI-Studio (наследует RV-11/RV-16) | Этап 18 = подсистема offline на детерминированных фейках (authn/authz/RBAC/sessions/CSRF/management/dashboards/AI-Studio); реальные store'ы/UI/SSO — через порты и seam'ы (raise `NotImplementedError`) | 18 (при Web UI/БД/SSO) | P1 | Pending Web UI/DB/SSO |
| RV-18 | Test Infrastructure runtime: реальные **performance/load**, **stress**, **chaos**, **mutation** (mutmut/cosmic-ray), **Hypothesis**, **distributed execution** (pytest-xdist), **CI/CD-пайплайн** (§R12.12), coverage-enforcement; реальные integration против живых PG/Redis/API (наследует RV-4…RV-17) | Этап 19 = инфраструктура вне `app/`, offline на детерм. сидах/фейках (модели/раннеры/решения); тяжёлые инструменты — seam'ы (raise `NotImplementedError`), не устанавливаются | 19 (при инструментах/CI/сервисах) | P1 | Pending tools/CI/services |

---

**Итого:** 3 Deferred Improvements · 5 Future Architecture Work (FA-2 **✅ implemented Stage 11**; FA-4
JSON-логгер — точка интеграции в Stage-10 middleware; FA-5 **implemented in code** + seam Stage 11) ·
4 ADR Candidates (ADR-C2 **closed**; ADR-C3=ADR-001 MTProto и ADR-C4=ADR-002 среда — открыты, дефолты
активны) · 5 Operational Risks · 6 Testing Gaps · **18 Runtime Verification Required (RV-1…RV-18)**.
**Обновлено после Этапа 20 (ФИНАЛ, проект завершён 20/20):** Этап 20 — только документация/release
engineering/DevOps-артефакты, **`app/` не изменён** (Production Code Freeze соблюдён; публичные Protocol/
зависимости/бизнес-логика/layering не тронуты; gate неизменён — 466 passed, mypy 385, 0 `type: ignore`).
Добавлены сводки/реестры: `ARCHITECTURE_MAP.md`, `DEPENDENCY_MAP.md`, `MASTER_SPEC_TRACEABILITY_FINAL.md`,
`PUBLIC_CONTRACT_REGISTRY.md`, `ADR_SUMMARY.md`, `RUNTIME_VERIFICATION_REGISTRY.md`,
`PRODUCTION_READINESS_SUMMARY.md`, `PROJECT_COMPLETION_SUMMARY.md` + дерево `docs/`. Новых RV не добавлено
(RV-18 — последний). Открытое — только RV-1…RV-18 (Production Readiness Review) и 2 открытых ADR. Ни один
пункт не блокирует завершение проекта. Дальнейшие действия — только на живой инфраструктуре по решению
владельца.
