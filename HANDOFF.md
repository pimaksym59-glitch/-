# PROJECT HANDOFF — AI Telegram Automation Platform

**Дата:** 2026-07-27 · **Ветка:** `master` · **Последний тег:** `stage-19-tests` · **Версия:** 0.1.0
· **ОС:** Windows 11 · shell PowerShell + Git-Bash · Рабочая папка: `C:\Users\Fupxrx\Desktop\projects` ·
venv: `.venv` (Python **3.14.6**). Инструменты запускать через `.venv/Scripts/`:
`.venv/Scripts/ruff.exe check .`, `.venv/Scripts/python.exe -m mypy`, `.venv/Scripts/pytest.exe -q`.
Рабочее дерево **чистое**. Файлов: **256** `.py` в `app/`, **131** в `tests/`.

---

## 1. Цель проекта

Production-ready AI-платформа, которая **полностью автономно** ведёт любое количество Telegram-каналов:
сама генерирует уникальный текст и фотореалистичные изображения, публикует по расписанию, анализирует
результаты, помнит стиль/персону/актёров/язык/аудиторию каждого канала, избегает повторов, масштабируется
на N каналов **без изменения кода**. После первичной настройки — без ручного участия. Система выглядит как
команда (редактор, копирайтер, дизайнер, контент-менеджер, маркетолог, аналитик) над каждым каналом.

## 2. Текущая архитектура

- **Модульный монолит** (НЕ микросервисы): один код-базис, процессы `api`/`scheduler`/`worker` поверх
  общей очереди задач в PostgreSQL (`tasks`, `FOR UPDATE SKIP LOCKED`). Redis — кэш/распределённый
  rate-limiter/локи/идемпотентность/pub-sub.
- **Слои строго вниз (циклы запрещены):** `api → services → (domain, repositories) → models/db`. Домен не
  открывает сессию БД и не знает HTTP; репозитории — только SQL; сервисы — оркестрация; api — только
  маршруты. **AST-guard** `tests/test_layering.py` держит направление и запрещённые импорты.
- **Пайплайн публикации = 5 стадий-задач** с continuation-chaining: `generate_text → validate →
  generate_image → publish → collect_metrics`.
- **Provider-abstraction + фейки** (§R2.10): LLM/Image/Embedding/Telegram/Metrics — через Provider
  Protocols Этапа 11 (`get_*_provider(settings)`: реальный при наличии ключа, иначе фейк). **Вся система
  запускается и тестируется offline.**
- **Паттерн доменных движков (Этапы 12–16):** каждый движок (AI/Image/Telegram) + подсистемы (Memory/RAG,
  Validation) — **provider-agnostic оркестраторы** поверх Protocol'ов Этапа 11 и **портов** (Memory/RAG/
  Validation/state/rate-limit/idempotency); реальные адаптеры (LLM/embeddings/image-API/Bot API/CLIP) —
  **Runtime Verification Pending (RV)**. Подсистемы **независимы** друг от друга (проверено grep +
  layering guard); связывание — только в `app/services/*` (composition) и через публичные Protocol.
- **Транспорт Telegram** — Bot API/aiogram-абстракция (НЕ прямой aiogram в домене; НЕ MTProto).
- **Docker:** один образ, роли = команды; наружу порты только у caddy.
- **Единственный источник требований** — `MASTER_SPEC.md` v2.0 (ID требований `R<раздел>.<номер>`).
  **Architecture Freeze ACTIVE** — изменения архитектуры только через новый ADR.

## 3. Все принятые решения и причины

Полный «reconciliation ledger» (44 решения) — в `MASTER_SPEC.md` Appendix A. Ключевые: (1) модульный
монолит; (2) два system-prompt (builder≠runtime); (3) слои с однонаправленными зависимостями; (4) ORM в
`app/models/`; (5) профиль канала — истина в БД, YAML=seed; (6) эмбеддинги — vector-колонка на владельце;
(7) размерность эмбеддингов — платформенная константа (текст 1536, CLIP/face 512); (8) UUIDv7 PK (`uuid6`);
(9) soft delete + partial unique `WHERE deleted_at IS NULL`; (10) optimistic lock `version`;
(11) Persona(голос)≠Actor(визуал); (12) analytics — временной ряд; (13) `MAX_REWRITES=3`≠`MAX_RETRIES=5`;
(14) «окно 500»=векторное сравнение (в промпт не идёт), few-shot K=3–5; (15) self-review=rule-gates +
LLM-judge; (16) self-learning=bandit; (17) роутинг: тело=`claude-opus-4-8`, judge/CTA/тема=`claude-haiku-4-5`;
(18) дубли текста — каскад дёшево→дорого (trigram→sentence→vector); (19) постоянство лица=identity-conditioning
по референсам/LoRA (не текст/seed); (20) дубли изображений — phash≠scene-metadata≠CLIP; (21) разнообразие —
до генерации, CLIP — верификация после; (22) `IMAGE_MAX_REGEN=3`≠retries; (23) Bot API/aiogram; (24)
планирование времени держит наша очередь (`run_at`); (25) Bot API не отдаёт views/реакции; (26) публикация
at-least-once → неоднозначный сбой=`needs_review`, dedup_key до отправки; (27) лимиты Telegram пер-бот
(ключ `bot_token`+`channel_id`); (28) chaining, не DAG; (29) LEAD_TIME; (30) мульти-инстанс scheduler=
идемпотентный слот+advisory; (31) изоляция канала в RAG=hard filter; (32) KB=documents/document_chunks;
(33) Style Memory=признаки; (34) панель=клиент services/api; (35) аналитика только доступное; (36) 5 ролей
RBAC на бэкенде; (37) audit_log/config_versions; (38) AI Studio изолирован; (39) A/B temporal/cross-channel;
(40) governance bandit; (41) контейнеры=роли образа; (42) rate-limiter распределённый (Redis); (43)
миграции горячих таблиц — expand-contract; (44) секреты — secret manager, БД least-privilege.

Позже принятые: база образа python:3.13-slim (floor `>=3.13`, dev-venv 3.14); UUIDv7=`uuid6`; dev-deps
через PEP 735 `[dependency-groups]`; initial-миграция через `Base.metadata.create_all`; enum — один объект
на PG-тип; идемпотентность слота Scheduler — через `dedup_key` (Producer не менять); AI Engine видит
Validation только через `OutputValidator` Protocol; Memory/RAG kernel — storage-agnostic (Store-протоколы,
без pgvector/FAISS); Validation Engine — **stdlib-only** (максимальная независимость); Telegram Engine —
**library-agnostic** (no aiogram в домене); Image Engine — provider-agnostic (aspect — модель, не строки).

**Открытые решения владельца** (действуют дефолты): ADR-001 (MTProto stats-адаптер) — дефолт «нет»;
ADR-002 (среда развёртывания) — дефолт «VM+Compose+Caddy». Оба `Proposed`.

## 4. Структура файлов и папок

```
projects/
├── MASTER_SPEC.md  DATABASE_SPEC.md  API_SPEC.md  TEST_PLAN.md            # SoT + реализация/верификация
├── TECHNICAL_BACKLOG.md  TRACEABILITY_STAGE2.md                          # ЖИВЫЕ документы
├── HANDOFF.md  READY_FOR_IMPLEMENTATION.md  REPORT.md  BASELINE.md  POC_IDENTITY.md  DOCUMENT_AUDIT_V2.md
├── TASK_BREAKDOWN_STAGE{2..16}.md                                        # планы этапов (утверждённые)
├── STAGE{1..16}_REPORT.md  CODE_AUDIT_STAGE{1..16}.md  RELEASE_NOTES_STAGE{1..16}.md   # отчёты (по этапам)
├── ARCHITECTURE_AUDIT_STAGE2.md  DOCKER_AUDIT_STAGE3.md  STAGE1_FINAL.md  HANDOFF_STAGE2.md
├── README.md  pyproject.toml  alembic.ini  .env  .env.example  .gitignore  .dockerignore  docker-compose.yml
├── docker/{Dockerfile,Caddyfile,postgres/init.sql}  config/{global,development,production}.yaml
├── legacy/  (архив старого билда — НЕ трогать)
├── app/  (201 .py)
│   ├── __init__.py  __main__.py (python -m app doctor)  main.py (uvicorn app.main:app)  py.typed
│   ├── core/config.py  core/errors.py  core/redis/{manager,keys,ttl,cache,idempotency,rate_limiter,locks,pubsub}.py
│   │        core/providers/{base,errors,health,registry,factory,capabilities,resilience,observability,testing}.py
│   ├── db/{base,session,types}.py + migrations/{env.py, versions/0001_initial.py}
│   ├── models/{__init__,base,enums,channel,content,image,queue,memory,knowledge,analytics,user}.py  (25 таблиц)
│   ├── repositories/{base,channel,post,image,memory,task,schedule}_repository.py
│   ├── workers/{status,backoff,retry,errors,handler,registry,pipeline,producer,dispatcher,executor,worker,hooks,log,metrics,run}.py
│   ├── scheduler/{timing,missed,holidays,advisory,scanner,materializer,scheduler,runner,run}.py
│   ├── api/{app,lifespan,deps,auth,errors,pagination,background}.py + api/v1/{router, routes/health}.py
│   ├── middleware/{request_id,logging}.py
│   ├── schemas/{base,errors,pagination,health}.py
│   ├── llm/{base,fakes}.py       # LLMProvider/EmbeddingProvider + фейки (Этап 11)
│   ├── images/{base,fakes, types,engine,prompt,enhancement,style,aspect,size,selection,safety,validation,postprocess,regen,batch,streaming,cost}.py  (Этап 15)
│   ├── telegram/{base,fakes, types,mapping,source,updates,middleware,router,registry,handlers,dispatcher,state,formatter,attachments,ratelimit,idempotency,retry,recovery,publishing,multiplatform,engine}.py  (Этап 16)
│   ├── content/{types,engine,pipeline,templates,context,budget,sources,selection,structured,validation,rewrite,fallback,streaming,cost,fakes}.py  (Этап 12 — AI Engine)
│   ├── rag/{types,similarity,embedding,chunking,stores,filters,retrieval,ranking,assembly,cache,observability,fakes,knowledge}.py  (Этап 13)
│   ├── memory/{types,stores,source}.py  (Этап 13 — независимая подсистема)
│   ├── validators/{models,ports,rules,registry,pipeline,deduplication,humanization,persona,policy,gates,decision,observability,engine,fakes}.py  (Этап 14 — stdlib-only)
│   ├── services/{providers,health,lifecycle,ai,rag,validation,images,telegram}.py  (composition roots)
│   ├── analytics/  notifications/  utils/   # ПУСТЫЕ пакеты (этапы 17+)
│   └── (middleware реально в app/middleware/)
└── tests/  (87 .py; зеркалит app/): core/ db/ redis/ repositories/ workers/ scheduler/ api/ content/ rag/ memory/ validators/ images/ telegram/ services/ + test_layering.py + test_repository_structure.py
```

## 5. Что уже реализовано (Этапы 1–16, теги)

| Этап | Тег | Суть |
|---|---|---|
| 1 Repository Structure | `stage-1-baseline` | 23 пакета, py.typed, toolchain, AST-guard слоёв; старый билд → `legacy/` |
| 2 Configuration | `stage-2-config` | Pydantic Settings (env-first, секреты только env, fail-fast, to_safe_dict), `python -m app doctor` |
| 3 Docker | `stage-3-docker` | один Dockerfile (multi-stage, non-root, 3.13-slim), compose (pgvector/redis/caddy), Caddyfile |
| 4 Persistence | `stage-4-database` | async db, 25 ORM-таблиц (8 enums, pgvector 1536/512, HNSW/partial-unique/GIN/FTS, `tasks`), Alembic, репозитории |
| 5 Redis | `stage-5-redis` | RedisManager, KeyBuilder, TTL, Cache, IdempotencyStore, RateLimiter (Lua), DistributedLock, Pub/Sub |
| 6,7 | (закрыты Этапом 4) | ORM-модели + репозитории |
| 8 Task Queue | `stage-8-queue` | собственный async-движок `app/workers/*` (без Celery/RQ): registry/dispatcher/executor/worker/retry/backoff/DLQ/hooks; Executor 100% offline |
| 9 Scheduler | `stage-9-scheduler` | продюсер: timing/DST, missed, holidays, advisory, scanner, materializer (через Producer), runner; чистые вычисления 98–100% |
| 10 API | `stage-10-api` | FastAPI factory, lifespan, DI, errors→единая схема, middleware (request-id/logging/CORS/gzip), health live/ready, pagination, auth/background seams |
| 11 Providers | `stage-11-providers` | `app/core/providers/*` (base/registry/factory/errors/health/resilience/observability) + per-kind Protocol'ы + фейки (LLM/Image/Embedding/Telegram) |
| 12 AI Engine | `stage-12-ai-engine` | `app/content/*`: pipeline/context/budget/selection(prov≠model)/structured/rewrite(≠retry)/fallback/hooks; на `FakeLLMProvider` |
| 13 Memory/RAG | `stage-13-rag` | `app/rag` (storage-agnostic kernel + Knowledge) + `app/memory` (независимая); embedding через провайдер; channel-isolation |
| 14 Validation | `stage-14-validation` | `app/validators` (**stdlib-only**): rule engine/registry/gates/decision; dedup/humanization/persona/policy; адаптер `OutputValidator` в services |
| 15 Image Engine | `stage-15-image-engine` | `app/images/*`: prompt/style/enhancement/selection/aspect/size/safety/validation-port/postprocess(thumbnail+phash)/regen; на `FakeImageProvider`; 100% |
| 16 Telegram Engine | `stage-16-telegram-engine` | `app/telegram/*` (**no aiogram**): mapping/source(webhook/polling)/router/registry/handlers/dispatcher/middleware/state/formatter/attachments/ratelimit/idempotency/retry/recovery/publishing; на `FakeTelegramProvider`; ~99% |
| 17 Analytics & Observability | `stage-17-analytics` | `app/analytics/*` (**stdlib-only**): event/taxonomy/registry/collector/dispatcher/sampling/pipeline + metrics(counters/timers/histograms/aggregation) + audit-pipeline + correlation + tracing/observability hooks + export-seam'ы + retention; на детерм. фейках; ~99% |
| 18 Admin Panel | `stage-18-admin-panel` | `app/admin/*` (**независим, без fastapi**): authn⟂authz⟂RBAC + sessions/CSRF + management(users/channels/prompts/providers/config) + dashboards(health/metrics/analytics/jobs/errors) + feature-flags + pagination/filtering/search + DTO-mapping + AI-Studio + Web UI/SSO seam'ы; на детерм. фейках; ~99% |
| 19 Test Infrastructure | `stage-19-tests` | `tests/framework|contract|e2e` (**вне `app/`**): SeedManager + data + factories⟂fixtures + fake-catalogue + unit/integration/contract/e2e-архитектуры + 9 стратегий (snapshot/property/mutation/performance/concurrency/stress/chaos/compatibility/regression) + reporting/coverage + CI/distributed seam'ы; E2E-пайплайн + contract-тесты + independence-guard; ~99% |

**Toolchain на HEAD:** ruff — All checks passed; `mypy --strict` — Success (286 files); pytest —
**466 passed, 6 skipped** (все skipped = gated integration за `RUN_INTEGRATION=1` + сервисы). `0 type: ignore`
во всём коде.

## 6. Что находится в работе

**Ничего в процессе.** Этап 19 завершён, принят и закоммичен; рабочее дерево чистое. Следующий — Этап 20
(Docs & DevOps), **план ещё не создан** (ждёт разрешения владельца начать).

## 7. Что осталось сделать (по §R13.1)

20. **Docs & DevOps** (§R12.13: документация + CI/CD, backup/restore, monitoring/alerting, secret manager,
    uv.lock) — финальный этап.
Плюс наполнение доменных стадий реальными адаптерами (RV-10..RV-18) при появлении сервисов/инструментов.
Аналитические вычисления §R11.4–R11.8 (bandit/experiments/report/forecast) — поверх фундамента Этапа 17.

## 8. Все TODO (`TECHNICAL_BACKLOG.md` — живой)

- **Deferred Improvements:** DI-1 `__all__` для публичного API; DI-2 единый источник дефолтов §Appendix B
  (код↔yaml↔spec); DI-3 убрать side-effect `storage_dir.mkdir` из загрузки конфига.
- **Future Architecture Work:** FA-1 БД(канал)-оверрайд конфига (этапы 6–7 задел); FA-2 **✅ closed** (выбор
  фейка при secret None — реализовано Этап 11); FA-3 приоритет `telegram_bot_token` vs `bot_token_ref`;
  FA-4 структурный JSON-логгер + маскирование (точка интеграции — Stage-10 middleware); FA-5 rate-limiter —
  **implemented in code** (Stage 5) + seam (Stage 11), интеграция в провайдер-вызовы позже.
- **ADR Candidates:** ADR-C1 Python 3.13/3.14 (условный); ADR-C2 **✅ closed** (uuid6); ADR-C3=ADR-001
  (MTProto stats, Proposed); ADR-C4=ADR-002 (среда развёртывания, Proposed).
- **Operational Risks:** OR-1 APP_ENV как env (addressed); OR-2 storage_dir read-only (mitigated); OR-3
  прод-секреты secret manager (partial); OR-4 `database_url` требует `+asyncpg`; OR-5 `get_settings` lru_cache.
- **Testing Gaps:** TG-1 тест `get_settings()`; TG-2 ассерт §R4.6 embedding-констант; TG-3 полный ассерт
  §Appendix B (проверены 4/10); TG-4 ASCII-fallback `_marks()`; TG-5 doctor «всё сконфигурировано»; TG-6
  тела async-запросов репозиториев — только integration.
- **Runtime Verification Required (RV-1…RV-17)** — закрываются только при живых сервисах, **не** засчитаны:
  RV-1 docker build + полный стек на 3.13; RV-2 нативная валидация docker/caddy в контейнере; RV-3
  §R12.3-5/§R4.1 runtime; RV-4 `alembic upgrade head`; RV-5 CRUD+pgvector/HNSW/optimistic-lock; RV-6 Redis
  I/O/Lua/pub-sub; RV-7 queue-runtime (SKIP LOCKED/enqueue/конкуренция); RV-8 scheduler-runtime (advisory/
  материализация/идемпотентность); RV-9 API-runtime (readiness к живым PG/Redis, uvicorn, lifespan); RV-10
  real-provider adapters (OpenAI/Anthropic/aiogram) + установка/импорт на 3.14; RV-11 AI-Engine против живых
  LLM; RV-12 RAG против живых pgvector/embeddings + keyword/hybrid/reranking; RV-13 Validation LLM-judge +
  vector-dedup; RV-14 Image против живых провайдеров + identity/CLIP; RV-15 Telegram против живого Bot API/
  webhook/polling + distributed rate-limit + at-least-once; RV-16 Analytics экспорт telemetry (OTel/
  Prometheus)/персистентность/engagement/внешние бэкенды; RV-17 Admin Web UI (HTMX/HTTP)/браузер/cookie-
  сессия/CSRF по сети/хэшер-паролей/MFA/SSO/персистентность/действия через очередь; RV-18 Test Infra —
  реальные load/stress/chaos/mutation/Hypothesis/distributed(xdist)/CI-CD/coverage-enforcement.

## 9. Известные баги

**Нет.** На каждом этапе self-review/аудит: техдолга / `type: ignore` / `print` / TODO-FIXME в коде нет.
Незакрытое — только Runtime Verification Pending (RV-1..RV-15): непроверенные из-за отсутствия живых
сервисов пути (не баги). Наблюдения (не баги): config discovery в контейнере зависит от cwd `/app`;
`database_url`-валидатор допускает `postgresql` без `+asyncpg` (OR-4); дублирование дефолтов Appendix B
(DI-2); Telegram at-least-once использует mark-before-send (реальный pending/confirmed idempotency — RV-15);
Stage-11 `ImageProvider`/`TelegramProvider` не принимают model/negative/parse_mode (в metadata; расширение).

## 10. Ограничения и требования

- **MASTER_SPEC.md v2.0** — единственный Source of Truth (при конфликте — он). Иерархия: MASTER_SPEC >
  DATABASE/API/TEST_SPEC > docs/adr > docs/spec (историч.) > код.
- **Architecture Freeze ACTIVE** — изменения архитектуры только через новый ADR.
- **Staged delivery (строго):** один этап за раз → сперва план `TASK_BREAKDOWN_STAGE<N>.md` → **СТОП на
  утверждение** → владелец утверждает план с доп. требованиями → реализация → self-review + ruff +
  mypy --strict + pytest → 3 отчёта (`STAGE<N>_REPORT`/`CODE_AUDIT_STAGE<N>`/`RELEASE_NOTES_STAGE<N>`) →
  обновить живые `TECHNICAL_BACKLOG.md`/`TRACEABILITY_STAGE2.md` + README-секцию → **серия из 3 коммитов
  (feat/test/docs) + один тег** `stage-<N>-<name>` → **СТОП, ждать приёмки** владельца («Этап N принимаю»).
- **Без Docker/PostgreSQL/Redis/внешних API:** НЕ имитировать runtime; разделять статусы **Implemented /
  Statically Verified / Runtime Verification Pending**; integration-тесты писать (gated `RUN_INTEGRATION=1`),
  но не засчитывать. Не менять версию Python и не создавать ADR автоматически — только с подтверждения.
- **Gate на новые зависимости:** объявить в `pyproject`, установить и проверить импорт на 3.14; при
  несовместимости — СТОП + отчёт + варианты.
- **Секреты** только через env; **изоляция каналов** `WHERE channel_id` (кроме Global Memory).
- **Доп. требования владельца по подсистемам (устойчивый паттерн):** движки/подсистемы **независимы** (не
  импортируют друг друга; проверяется grep + guard); взаимодействие **только через публичные Protocol**;
  все интерфейсы — **Protocol** (не ABC); DTO — **immutable (`frozen=True`)**; фейки — **детерминированы**
  (без random/времени); retry — **reuse** существующей инфраструктуры (не дублировать); в отчётах —
  разделы «Публичные контракты» (Stable/Internal), «Матрица зависимостей», «Архитектурная проверка»,
  «Проверка архитектурных инвариантов».

## 11. Используемые библиотеки и версии (venv, Python 3.14.6)

**Установлены (runtime):** fastapi 0.139.2 · uvicorn 0.51.0 · pydantic 2.13.4 · pydantic-settings 2.14.2 ·
pyyaml 6.0.3 · sqlalchemy 2.0.51 · alembic 1.18.5 · asyncpg 0.31.0 · pgvector 0.5.0 · greenlet 3.5.3 ·
redis 8.0.1 · pillow 12.3.0 · uuid6 2025.0.1 · tzdata 2026.3 · starlette 1.3.1.
**Dev:** ruff 0.15.22 · mypy 2.3.0 · pytest 9.1.1 · pytest-asyncio 1.4.0 · httpx 0.28.1 · types-PyYAML.
**Объявлены в `pyproject`, но НЕ установлены** (нужны на адаптерных этапах / RV-10, RV-15): **aiogram ·
aiohttp · anthropic · openai** — их установка/совместимость с 3.14 = часть RV-1/RV-10.
**Модели ИИ:** тело/продающее=`claude-opus-4-8`; заголовок/CTA/тема/judge=`claude-haiku-4-5`;
embedding-константа (текст 1536, CLIP/face 512). **Docker-образы:** python:3.13-slim, pgvector/pgvector:pg16,
redis:7-alpine, caddy:2-alpine. Floor Python `>=3.13` (dev 3.14, прод-образ 3.13).

## 12. Все важные договорённости по стилю кода

- Python 3.13+, полная типизация, `from __future__ import annotations` в каждом модуле.
- **ruff** (format+lint): line-length **100**; правила `E,F,W,I,UP,B,C4,SIM,TID,RUF`; PEP 695 дженерики
  (`class X[T: Base]`, `StructuredOutputParser[SchemaT: BaseModel]`); `enum.StrEnum`; **без `print()`**
  (логирование через интерфейс); без ambiguous-unicode (× → x, ± → +/-, en-dash → hyphen; «cliché»→«cliche»);
  `try/except/pass` → `contextlib.suppress`; SIM102/SIM103 (объединять/возвращать условия).
- **mypy `--strict`: 0 ошибок, 0 `type: ignore`** — обходы типовых пробелов структурно / через фейки / CM,
  НЕ ignore. Тест frozen-инвариантов — через `setattr(obj, var_name, val)` (обходит B010 без ignore).
  Alembic-миграции исключены. pydantic/SQLAlchemy — явные kwargs; `_env_file=`/`env_file` в тестах отключать
  через `model_config`.
- Файл ≤400–500 строк; 1 класс = 1 ответственность; функция ≤20–40 строк; docstrings на сервис/публичный
  метод/pipeline/сложную функцию.
- **Тесты:** offline-first; чистая логика — юнит (всегда); пути с БД/сетью/внешними API — integration за
  `RUN_INTEGRATION=1` + `pytest.mark.integration` + `skipif` (не засчитывать без сервисов); `tests/`
  зеркалит `app/`; фейки провайдеров/портов; детерминизм через инъекцию `clock`/`rand`/`now`.
- **Git:** ветка `master`; conventional-коммиты `feat/test/docs(stage-N):` + один тег `stage-N-<name>`;
  каждый commit заканчивается `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`; коммитить только
  по указанию (серия из 3 в конце этапа); `.env`/`.venv`/`.claude`/кэши/coverage — в `.gitignore`. LF→CRLF
  warning'и на Windows безвредны. **Не пушить на remote** (всё локально, по замыслу).
- Живые `TECHNICAL_BACKLOG.md`/`TRACEABILITY_STAGE2.md` — обновлять, не пересоздавать. Никаких временных
  решений/костылей/дублирования/«магических» строк/чисел (ключи → KeyBuilder, TTL → ttl.py, пороги/
  стоп-листы → RuleContext/config/§Appendix B, aspect → модель, не строки).

## 13. Последние изменения

- Завершён и **принят Этап 19 (Test Infrastructure)** — тег `stage-19-tests` (3 коммита feat/test/docs).
  Независимая от production подсистема **вне `app/`** (`tests/framework|contract|e2e`): единый `SeedManager`,
  детерминированная генерация, Fixtures ⟂ Factories, каталог фейков, архитектуры Unit/Integration/Contract/
  E2E, девять отдельных стратегий (snapshot/property/mutation/performance/concurrency/stress/chaos/
  compatibility/regression), Reporting/Coverage отдельными компонентами, CI/CD+distributed — seam'ы;
  E2E-пайплайн (§R13.2) + contract-тесты фейков + independence/invariant-тесты. `app/` **не изменён**.
  Backlog +RV-18; traceability +блок Этапа 19 (27/27).
- Ранее принят Этап 18 (Admin Panel) — тег `stage-18-admin-panel`: независимая доменная подсистема
  `app/admin/` (authn⟂authz⟂RBAC, sessions/CSRF, management, dashboards, AI-Studio, Web UI/SSO seam'ы).
- Дерево чистое; последний тег `stage-19-tests`.

## 14. Следующий шаг

**Этап 20 — Documentation & DevOps** (§R13.1 шаг 20, §R12.13) — финальный этап. Владелец ещё **не** дал
разрешения начать. Порядок действий (строго по staged delivery):

1. Дождаться от владельца «**Разрешаю начать Этап 20**» (+ возможные требования к плану).
2. Подготовить **только** `TASK_BREAKDOWN_STAGE20.md` (последовательность задач, создаваемые файлы, охват
   документации + DevOps, критерии, риски, реализуемые требования MASTER_SPEC + разделы «Матрица
   зависимостей»/«Архитектурная проверка (план)»). **СТОП на утверждение.**
3. Ключевой контекст Docs & DevOps (§R12.13, §R13.4): пользовательская/операционная документация; CI/CD
   (§R12.12 format→static→tests), backup/restore, monitoring/alerting, secret manager, `uv.lock`; реальные
   пайплайны/инфраструктура — RV (наследуют RV-1/RV-18); не менять архитектуру `app/`.
4. После утверждения — реализация → gate (ruff/mypy/pytest) → 3 отчёта + обновить живые доки + README →
   3 коммита + тег `stage-20-docs` → **СТОП на приёмку**.

---

## Быстрый старт для нового чата

1. **Прочитать:** `MASTER_SPEC.md` (SoT), `TECHNICAL_BACKLOG.md`, `TRACEABILITY_STAGE2.md`, `HANDOFF.md`,
   `TEST_PLAN.md`/`API_SPEC.md`/`DATABASE_SPEC.md` (по необходимости), последние `STAGE19_REPORT.md`/
   `CODE_AUDIT_STAGE19.md`.
2. **Проверить:** `git log --oneline -6`, `git tag -l "stage-*"`, `git status --short` (чисто),
   `.venv/Scripts/pytest.exe -q` (ждать **466 passed / 6 skipped**), `.venv/Scripts/python.exe -m mypy`
   (Success), `.venv/Scripts/ruff.exe check .` (All checks passed).
3. **Соблюдать:** Architecture Freeze; staged delivery (план → СТОП → реализация → gate → 3 отчёта →
   3 коммита + тег → СТОП на приёмку); offline-first + RV-статусы; независимость подсистем через Protocol'ы;
   стиль §12; 0 `type: ignore`.
4. **Выполнять** Этап 20 по §14 — **только после разрешения владельца**, начиная с плана.
