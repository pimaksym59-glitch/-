# PROJECT HANDOFF — AI Telegram Automation Platform

**Дата:** 2026-07-22 · **Для:** продолжения работы в новом чате · **Ветка:** `master` ·
**HEAD:** `b123d0a` (tag `stage-8-queue`) · **Версия:** 0.1.0 · **ОС:** Windows 11 · shell PowerShell + Git-Bash.
**Рабочая папка:** `C:\Users\Fupxrx\Desktop\projects`. **venv:** `.venv` (Python 3.14.6).
Инструменты запускать через `.venv/Scripts/` (пример: `.venv/Scripts/ruff.exe check .`,
`.venv/Scripts/python.exe -m mypy`, `.venv/Scripts/pytest.exe -q`).

---

## 1. Цель проекта

Production-ready AI-платформа, которая **полностью автономно ведёт любое количество Telegram-каналов**:
сама генерирует уникальный текст и фотореалистичные изображения, публикует по расписанию, анализирует
результаты, помнит стиль/персону/актёров/язык/аудиторию каждого канала, избегает повторов, и
масштабируется на N каналов без изменения кода. После первичной настройки — без ручного участия.
Итог: система выглядит так, будто над каждым каналом ежедневно работает команда (редактор, копирайтер,
дизайнер, контент-менеджер, маркетолог, аналитик).

## 2. Текущая архитектура

- **Модульный монолит** (НЕ микросервисы): один код-базис, исполняется несколькими процессами
  (`api`, `scheduler`, `worker`) поверх **общей очереди задач в PostgreSQL** (`tasks`,
  `FOR UPDATE SKIP LOCKED`). Redis — кэш/распределённый rate-limiter/локи/идемпотентность/pub-sub.
- **Слои (строго вниз, циклы запрещены):** `api → services → (domain, repositories) → models/db`.
  Доменные пакеты не открывают сессию БД и не знают HTTP; репозитории — только SQL; сервисы —
  оркестрация; api — только маршруты.
- **Пайплайн публикации = 5 стадий-задач** с continuation-chaining (каждая на успехе ставит
  следующую): `generate_text → validate → generate_image → publish → collect_metrics`.
- **Провайдер-абстракции с фейками** (LLM/Image/Embedding/Telegram/Metrics): вся система запускается и
  тестируется **offline**; реальный клиент подключается при наличии ключа.
- **Транспорт Telegram — Bot API/aiogram** (не MTProto; постинг user-аккаунтом запрещён по ToS).
- **Docker:** один образ, роли = команды (`api`/`scheduler`/`worker`); инфра — postgres(pgvector)/redis/
  caddy; наружу порты только у caddy (least exposure).
- **Единственный источник требований — `MASTER_SPEC.md` v2.0** (145 нормативных требований с ID
  `R<раздел>.<номер>`). Architecture Freeze **ACTIVE** — изменения архитектуры только через новый ADR.

## 3. Все принятые решения и причины (reconciliation ledger + позже)

Полный «reconciliation ledger» из 44 решений — в `MASTER_SPEC.md` Appendix A. Ключевые:

1. **Модульный монолит**, не микросервисы — оверинжиниринг; независимость даёт очередь+воркеры.
2. Два system-prompt: builder (build-time) ≠ runtime контент-движок.
3. Слои `api→services→(domain,repositories)→models/db`; домен не трогает БД.
4. ORM-модели централизованы в `app/models/` (для Alembic autogenerate).
5. Профиль канала — источник истины в БД; YAML — только seed/import.
6. Эмбеддинги — `vector`-колонка на владельце (`memory`/`images`), не отдельная generic-таблица.
7. **Размерность эмбеддингов — платформенная константа**, не поле канала (иначе ломается ANN-индекс).
8. **UUIDv7** PK на insert-heavy таблицах (v4 фрагментирует индекс). Провайдер — библиотека `uuid6`.
9. Soft delete + **partial unique** `WHERE deleted_at IS NULL`.
10. Оптимистичная блокировка через `version` (`version_id_col`).
11. **Persona (текстовый голос) ≠ Actor (визуал)**; у канала нет `tone/writing_style`, только `default_persona_id`.
12. Analytics — временной ряд (`analytics_snapshots`), не одна строка.
13. `MAX_REWRITES=3` (качество) ≠ `MAX_RETRIES=5` (инфра).
14. «Окно 500» = векторное сравнение (0 токенов); в промпт — few-shot K=3–5.
15. Self-review = rule-based gates + **отдельный** LLM-judge (не самопроверка в том же вызове).
16. Self-learning = **bandit** с полом исследования (epsilon_min) + медленное обновление.
17. Роутинг моделей: тело=`claude-opus-4-8`, judge/CTA/тема=`claude-haiku-4-5`.
18. Дубли текста — каскад дёшево→дорого (trigram→предложения→пост→story/CTA).
19. **Постоянство лица актёра** = identity-conditioning по референсам/LoRA, не текст/seed (make-or-break, POC).
20. Дубли изображений — 3 механизма: phash ≠ метаданные ≠ CLIP.
21. Разнообразие изображений — на выборе сцены (до генерации); CLIP — верификация после.
22. `IMAGE_MAX_REGEN=3` (платно) ≠ `MAX_RETRIES`.
23. **Bot API/aiogram**; MTProto — опциональный адаптер только для чтения статистики.
24. Планирование времени держит **наша очередь** (`run_at`), не Telegram.
25. **Bot API не отдаёт просмотры/реакции постов** → влияет на аналитику и обучение (слабый сигнал).
26. Публикация at-least-once → неоднозначный сбой = `needs_review`, не авто-ретрай.
27. Лимиты Telegram **пер-бот** → при масштабе токен на канал/группу.
28. «Зависимости задач» = continuation-chaining, **не** DAG-движок.
29. **LEAD_TIME**: генерация до слота, publish на слот.
30. Мульти-инстанс scheduler: идемпотентный ключ слота + advisory lock.
31. Изоляция канала в RAG = **hard filter** (`WHERE channel_id`), не вес реранкинга.
32. KB требует таблиц `documents`/`document_chunks`.
33. Style Memory = признаки стиля, не тексты.
34. Панель = клиент `services`/`api`; ручные операции через ту же очередь.
35. Аналитика показывает только доступное; views/ER/CTR — за MTProto-адаптером.
36. Роли расширены до 5 (owner/admin/editor/analyst/viewer); RBAC на бэкенде.
37. Аддендум: `audit_log`, `config_versions`.
38. AI Studio изолирован: без записи в память и без публикации.
39. **A/B со сплитом аудитории невозможен** в Telegram → temporal/cross-channel.
40. Governance: bandit крутит выбор; идентичность канала — только человек.
41. Контейнеры `api/scheduler/worker` = роли одного образа.
42. Rate-limiter — **распределённый (Redis)**, не in-process семафор.
43. Миграции горячих таблиц — expand-contract + `CREATE INDEX CONCURRENTLY`.
44. Секреты в проде — secret manager, не `.env`; БД — least-privilege.

**Позже принятые (по ходу этапов):**
- База образа Docker — **python:3.13-slim** (стабильные wheel; floor остаётся `>=3.13`; dev-venv 3.14). Не ADR.
- **ADR-C2 закрыт**: UUIDv7-провайдер — библиотека `uuid6` (работает на 3.13+/3.14; легко заменить на
  stdlib `uuid.uuid7()`, который есть только в 3.14).
- Dev-зависимости — через **PEP 735 `[dependency-groups]`** (`pip install -e . --group dev`).
- Alembic-скрипты исключены из mypy-strict (`exclude = ["app/db/migrations/"]`).
- Initial-миграция создаёт схему через `Base.metadata.create_all` (baseline с гарантией parity моделям;
  далее обычный autogenerate).
- Enum-объекты SQLAlchemy — по одному на PG-тип (общий объект), чтобы `CREATE TYPE` не дублировался.
- Идемпотентность слота у Scheduler (этап 9, план) — через `dedup_key`, чтобы **не менять** Producer.
- Config discovery в контейнере — запуск из `/app` (source), `CONFIG_DIR=/app/config` (кандидат: env).

**Открытые решения владельца (дефолты действуют):**
- **ADR-001 (Proposed):** MTProto read-only stats-адаптер — дефолт «нет» (per-post метрики недоступны,
  self-learning слабый). Влияет на §5/10/11/12.
- **ADR-002 (Proposed):** целевая среда развёртывания — дефолт «одна VM + Compose + Caddy». Влияет на §12.

## 4. Структура файлов и папок

```
projects/
├── MASTER_SPEC.md            # SoT: 145 требований R*, Appendix A (44 решения)/B (параметры)/C (открытые)/D
├── DATABASE_SPEC.md          # полный DDL (25 таблиц, enums, индексы)
├── API_SPEC.md               # контракт /api/v1 + RBAC-матрица
├── TEST_PLAN.md              # уровни тестов + traceability
├── TECHNICAL_BACKLOG.md      # ЖИВОЙ: DI/FA/ADR-C/OR/TG + Runtime Verification Required (RV-1..RV-7)
├── TRACEABILITY_STAGE2.md    # ЖИВОЙ: требование→реализация→тесты→статус (Implemented/Static/Runtime)
├── READY_FOR_IMPLEMENTATION.md, REPORT.md, DOCUMENT_AUDIT_V2.md, BASELINE.md, POC_IDENTITY.md
├── ARCHITECTURE_AUDIT_STAGE2.md, DOCKER_AUDIT_STAGE3.md
├── STAGE{1..5,8}_REPORT.md, CODE_AUDIT_STAGE{1..5,8}.md, RELEASE_NOTES_STAGE{1..5,8}.md
├── TASK_BREAKDOWN_STAGE{2..5,8,9}.md, STAGE1_FINAL.md, HANDOFF_STAGE2.md, HANDOFF.md (этот файл)
├── README.md
├── pyproject.toml            # hatchling; deps + [dependency-groups].dev; ruff/mypy-strict/pytest config
├── alembic.ini
├── .env / .env.example / .gitignore / .dockerignore
├── docker-compose.yml
├── docker/{Dockerfile, Caddyfile, postgres/init.sql}
├── config/{global,development,production}.yaml (+ channels/ seed placeholder)
├── legacy/                   # архив прежнего билда (src/ layout) — не трогать
├── app/
│   ├── __init__.py  __main__.py   # `python -m app doctor`
│   ├── api/(v1/)  middleware/  services/          # presentation/application (пустые пакеты — этапы 10/12+)
│   ├── content/ images/(providers/) llm/ telegram/ memory/ rag/ validators/ analytics/ notifications/  # domain (пустые — этапы 12–17)
│   ├── core/
│   │   ├── config.py          # Pydantic Settings (env-first, секреты SecretStr, to_safe_dict, get_settings)
│   │   └── redis/{__init__,manager,keys,ttl,cache,idempotency,rate_limiter,locks,pubsub}.py
│   ├── db/{base,session,types}.py + migrations/{env.py, versions/0001_initial.py}
│   ├── models/{__init__,base,enums,channel,content,image,queue,memory,knowledge,analytics,user}.py  # 25 таблиц
│   ├── repositories/{base,channel_repository,post_repository,image_repository,memory_repository,task_repository}.py
│   ├── scheduler/__init__.py   # ПУСТОЙ — этап 9 (следующий)
│   ├── workers/{__init__,status,backoff,retry,errors,handler,registry,pipeline,producer,dispatcher,executor,worker,hooks,log,metrics,run}.py
│   ├── schemas/ utils/ __init__ (заготовки)
│   └── py.typed
└── tests/  (зеркалит app/: core/ db/ redis/ repositories/ workers/ + test_layering.py + test_repository_structure.py)
```

## 5. Что уже реализовано (этапы, теги)

Каждый этап: план (утверждается) → реализация → self-review → ruff/mypy-strict/pytest → 3 отчёта →
серия коммитов → один тег → стоп на подтверждение владельца.

- **Этап 1 — Repository Structure** (`stage-1-baseline` `7aa02b0`, `stage-1-baseline-docs` `056579e`):
  23 пакета `app/` по слоям, `py.typed`, pyproject+toolchain, guard слоёв (AST-тест). Старый билд → `legacy/`.
- **Этап 2 — Configuration** (`stage-2-config` `5dd33c9`): `app/core/config.py` (Pydantic Settings,
  env-first приоритет `env>.env>yaml>defaults`, секреты только из env — yaml их отфильтровывает,
  fail-fast валидация, `to_safe_dict()` маскирование), `python -m app doctor` (`app/__main__.py`,
  без сети), `config/*.yaml`, `.env.example`. 19 offline-тестов.
- **Этап 3 — Docker** (`stage-3-docker` `b20c9d7`): один `Dockerfile` (multi-stage, non-root,
  python:3.13-slim), `docker-compose.yml` (pgvector/pg16 + init.sql, redis, caddy; api/scheduler/worker
  под профилем `app`), `Caddyfile`, `.dockerignore`. **Docker Engine недоступен → runtime не проверялся
  (RV-1..RV-3).**
- **Этап 4 — Persistence** (`stage-4-database` `8dbed10`, консолидировал §R13.1 шаги 4+6+7): async
  `app/db/*`, **25 ORM-таблиц** (`Entity`=UUIDv7+timestamps+soft-delete+optimistic version; `Record`=
  append-only; 8 enums; pgvector 1536 текст / 512 CLIP+face; HNSW/partial-unique/GIN/FTS; очередь `tasks`),
  Alembic (env+0001_initial), 5 репозиториев (PEP 695 generics, без бизнес-логики, caller-owned tx).
  **Нет живого PostgreSQL → миграции/запросы/pgvector = RV-4/RV-5.** 40 offline + 1 gated integration.
- **Этап 5 — Redis** (`stage-5-redis` `d341235`): `app/core/redis/*` — RedisManager (ленивый singleton,
  pool, graceful shutdown), KeyBuilder (`tai:{env}:{namespace}:{parts}`), TTL-константы, Cache
  (get/set/delete/exists/invalidate), IdempotencyStore (SET NX; источник истины — Postgres dedup_key),
  RateLimiter (распределённый token-bucket, Lua), DistributedLock (SET NX + Lua safe-release; ≠ pg
  advisory), Publisher/Subscriber. **Нет живого Redis → RV-6.** 13 offline + 2 gated.
- **Этапы 6 и 7** — закрыты в Этапе 4 (модели + репозитории).
- **Этап 8 — Task Queue & Registry** (`stage-8-queue` `b123d0a`): собственный async-движок `app/workers/*`
  (без Celery/RQ): status (автомат), backoff/retry (чистые функции), errors, handler-protocol, registry
  (типизированный, декларативный, unknown→HandlerNotRegistered не крашит), pipeline (chaining как данные),
  producer (enqueue, идемпотентность dedup_key), dispatcher (SKIP LOCKED, без бизнес-логики), executor
  (единая точка выполнения/исключений/статусов/ретраев; DLQ=dead), worker (loop + graceful shutdown/drain),
  hooks/log/metrics (инфра, no print), run.py entrypoint. **Executor покрыт на 100% offline** (все ветки
  на фейках). **Нет живого PG/Redis → SKIP LOCKED/персистентность/enqueue/конкуренция = RV-7.**
  70 offline + 4 gated.

**Toolchain на HEAD:** `ruff check .` — All checks passed; `mypy --strict` — Success (все файлы);
`pytest -q` — **70 passed, 4 skipped** (все skipped = integration, gated `RUN_INTEGRATION=1`).

## 6. Что находится в работе

- **Этап 9 — Scheduler**: **план готов и утверждён** владельцем (`TASK_BREAKDOWN_STAGE9.md`,
  создан, но **НЕ закоммичен** — единственный неотслеживаемый файл в дереве). **Реализация ещё не начата.**
  План: `app/scheduler/*` (timing/DST/missed/holidays — чистые функции; advisory-lock; scanner;
  materializer через **существующий Producer** + `dedup_key`; scheduler-tick; runner+recovery; run.py) +
  `app/repositories/schedule_repository.py`. Новая зависимость: `tzdata` (уже в venv 2026.3, объявить явно).
  Утверждён payload-подход к LEAD_TIME (scheduler кладёт `target_slot` в payload; «publish в слот» honored
  на этапе 16), чтобы **не менять** замороженный Этап 8.

## 7. Что осталось сделать (по §R13.1)

9. **Scheduler** (следующий) → 10. API (FastAPI эндпоинты + `app/main.py`) → 11. Провайдер-абстракции
+ фейки (LLM/Image/Embedding/Telegram) → 12. AI Engine → 13. Memory/RAG → 14. Validation → 15. Image
Engine → 16. Telegram Engine (aiogram) → 17. Analytics → 18. Admin Panel (HTMX) → 19. Тесты (по ходу) →
20. Документация. Плюс: CI/CD, backup/restore, monitoring/alerting, secret manager, uv.lock — раздел §12
(DevOps), обычно ближе к концу.

## 8. Все TODO (из TECHNICAL_BACKLOG.md — живой документ)

**Deferred Improvements:** DI-1 `__all__` публичного API; DI-2 единый источник дефолтов §Appendix B
(код↔yaml↔MASTER_SPEC, а также embedding-dims в `app/db/types.py`); DI-3 убрать side-effect
`storage_dir.mkdir` из загрузки конфига.
**Future Architecture Work:** FA-1 БД(канал)-оверрайд как высший business-config источник (этапы 6–7);
FA-2 выбор фейка провайдера при `secret is None` (§R2.10, этап 11); FA-3 приоритет `telegram_bot_token`
(платформенный) vs per-channel `bot_token_ref` (этапы 7/16); FA-4 структурированный JSON-логгер +
маскирование (§R12.9); FA-5 распределённый rate-limiter — **implemented in code** (Stage 5), интеграция
в провайдер-вызовы — этапы 11/16.
**ADR Candidates:** ADR-C1 фиксация Python 3.13 vs 3.14 (условный; стек ставится и там и там);
ADR-C2 — **CLOSED** (uuid6); ADR-C3 MTProto (=ADR-001, Proposed); ADR-C4 deploy env (=ADR-002, Proposed).
**Operational Risks:** OR-1 APP_ENV в environment — addressed; OR-2 storage_dir read-only — mitigated;
OR-3 прод-секреты через secret manager — partially; OR-4 `database_url` требует `+asyncpg`; OR-5
`get_settings` кэш `lru_cache`.
**Testing Gaps:** TG-1 тест `get_settings()`; TG-2 ассерт §R4.6 констант embedding; TG-3 полный ассерт
дефолтов §Appendix B (проверены 4/10); TG-4 ASCII-fallback `_marks()`; TG-5 doctor «всё сконфигурировано»;
TG-6 тела async-запросов репозиториев только integration.
**Runtime Verification Required (закрываются только при живых сервисах):** RV-1 `docker build` +
установка остатка стека (aiogram/anthropic/openai — сейчас НЕ установлены) на 3.13; RV-2 нативная
валидация docker/caddy; RV-3 §R12.3-5/§R4.1 в контейнере; RV-4 `alembic upgrade head` на PG; RV-5 CRUD +
pgvector/HNSW/optimistic-lock; RV-6 Redis SET/GET/EVAL(Lua)/SUBSCRIBE/pool; RV-7 queue-runtime (SKIP
LOCKED/enqueue/конкуренция).

## 9. Известные баги

**Нет.** На каждом этапе self-review/аудит — технического долга/`type: ignore`/`print`/TODO-FIXME в коде
не обнаружено. Единственные «незакрытые» пункты — **Runtime Verification Pending** (не баги, а
непроверенные из-за отсутствия живых PostgreSQL/Redis/Docker пути; см. RV-1..RV-7). Наблюдения (не баги):
config discovery в контейнере зависит от cwd (`/app`); `database_url` валидатор допускает `postgresql`
без `+asyncpg` (OR-4); дублирование дефолтов Appendix B (DI-2).

## 10. Ограничения и требования

- **MASTER_SPEC.md v2.0 — единственный Source of Truth** (при конфликте документов — он). Иерархия:
  MASTER_SPEC > DATABASE/API/TEST_SPEC > `docs/adr` > `docs/spec/*` (историч.) > код.
- **Architecture Freeze ACTIVE** — любое изменение архитектуры только через **новый ADR** (`docs/adr/`).
- **Staged delivery:** один этап за раз. Порядок каждого этапа: сперва план `TASK_BREAKDOWN_STAGE<N>.md`
  → стоп на утверждение → реализация → self-review + ruff + mypy --strict + pytest → `STAGE<N>_REPORT.md`,
  `CODE_AUDIT_STAGE<N>.md`, `RELEASE_NOTES_STAGE<N>.md` → **обновить** (не пересоздавать) живые
  `TECHNICAL_BACKLOG.md` и `TRACEABILITY_STAGE2.md` → серия логических коммитов + **один тег** → стоп.
  **Не переходить к следующему этапу без явного разрешения владельца.**
- **Среда без Docker/PostgreSQL/Redis:** НЕ имитировать runtime. Разделять статусы **Implemented /
  Statically Verified / Runtime Verification Pending**; интеграционные тесты писать, но не засчитывать.
  При недоступности — максимум статики + документировать ограничение. Не менять версию Python и не
  создавать ADR автоматически — только с подтверждения владельца.
- **Gate на установку зависимостей:** каждый этап с новыми пакетами — сначала установить и проверить
  импорт на Python 3.14; при несовместимости — стоп + отчёт + варианты, без автодействий.
- Секреты только через env; никогда в код/логи/git. `.env` в gitignore. Прод — secret manager.
- Изоляция каналов: каждый запрос к данным скоупится `channel_id` (кроме Global Memory).

## 11. Используемые библиотеки и версии (venv, Python 3.14.6)

**Установлены:** fastapi 0.139.2 · uvicorn 0.51.0 · pydantic 2.13.4 · pydantic-settings 2.14.2 · pyyaml
6.0.3 · sqlalchemy 2.0.51 · alembic 1.18.5 · asyncpg 0.31.0 · pgvector 0.5.0 · greenlet 3.5.3 · uuid6
2025.0.1 · redis 8.0.1 · pillow 12.3.0 · tzdata 2026.3.
**Dev:** ruff 0.15.22 · mypy 2.3.0 · pytest 9.1.1 · pytest-asyncio 1.4.0 · pytest-cov 7.1.0 · types-PyYAML.
**Объявлены в pyproject, но ещё НЕ установлены (нужны на этапах 11/16):** aiogram · aiohttp · anthropic ·
openai. (Их установка/совместимость с 3.14 — часть RV-1 / соответствующих этапов.)
**Целевые модели ИИ (когда дойдём):** тело поста — `claude-opus-4-8`; заголовок/CTA/тема/LLM-judge —
`claude-haiku-4-5`; embedding-модель — платформенная константа (текст 1536, CLIP/face 512).
**Docker-образы:** python:3.13-slim, pgvector/pgvector:pg16, redis:7-alpine, caddy:2-alpine.
**Floor Python — `>=3.13`** (dev-venv 3.14; прод-образ 3.13).

## 12. Договорённости по стилю кода

- **Python 3.13+**, полная типизация, `from __future__ import annotations` в каждом модуле.
- **ruff** (format + lint): line-length **100**; правила `E,F,W,I,UP,B,C4,SIM,TID,RUF`; PEP 695 дженерики
  (`class X[T: Base]`), не `Generic[T]`; `enum.StrEnum`; без `print()` (логирование через интерфейс);
  без ambiguous-unicode в docstring (× → x, ± → +/-, en-dash → hyphen); `getattr(x,"attr")` c 2 арг —
  запрещён (B009), использовать 3-арг с дефолтом или прямой доступ; `try/except/pass` → `contextlib.suppress`.
- **mypy `--strict`**: **0 ошибок, 0 `type: ignore`** (обходы типовых пробелов сторонних либ —
  структурно/через фейки/CM, не ignore). Alembic-миграции исключены из mypy (`exclude`).
  Замечание: pydantic/SQLAlchemy синтезируют `__init__` через dataclass_transform — конструировать модели
  явными kwargs; `_env_file=` в Settings mypy не принимает (в тестах отключать `.env` через `model_config`).
- Файл ≤400–500 строк; 1 класс = 1 ответственность; функция ≤20–40 строк; docstrings на сервис/публичный
  метод/pipeline/сложную функцию; понятные англ. имена.
- **Тесты:** offline-first (§R2.10); чистая логика — юнит (всегда), пути с БД/сетью — integration за
  `RUN_INTEGRATION=1` + `pytest.mark.integration` + `skipif` (пишутся, но не засчитываются без сервисов);
  `tests/` зеркалит `app/`; фейки провайдеров вместо реальных клиентов; детерминизм через инъекцию
  `clock`/`rand`/`now`.
- **Git:** ветка `master`; серия логических коммитов на этап (conventional: `feat/test/docs/chore(stage-N):`)
  + один тег `stage-N-<name>`; сообщения коммитов заканчиваются `Co-Authored-By: Claude Opus 4.8
  <noreply@anthropic.com>`; коммитить только по указанию владельца; секреты/`.env`/`.venv`/`.claude`/
  кэши/coverage — в `.gitignore`. LF→CRLF warning'и на Windows безвредны.
- **Живые документы** `TECHNICAL_BACKLOG.md` и `TRACEABILITY_STAGE2.md` — **обновлять**, не пересоздавать.
- Никаких временных решений/костылей/дублирования; никаких «магических» строк/чисел (ключи — через
  KeyBuilder, TTL — через `ttl.py`, параметры — из config/§Appendix B).

## 13. Последние изменения

- **Только что завершён и принят Этап 8** (Task Queue) — тег `stage-8-queue` `b123d0a` (3 коммита).
- Затем владелец **разрешил Этап 9 (Scheduler)** и попросил сперва план. **Создан
  `TASK_BREAKDOWN_STAGE9.md`** (утверждён владельцем) — **не закоммичен** (единственный `??` в git status).
- Владелец подтвердил: Pub/Sub был в объёме Этапа 5; ORM/Repositories закрыты Этапом 4 (этапы 6/7 закрыты).
- Дерево иначе чистое; HEAD = `b123d0a`.

## 14. Следующий шаг

**Реализовать Этап 9 (Scheduler) по утверждённому `TASK_BREAKDOWN_STAGE9.md`.** Порядок:
1. `TASK_BREAKDOWN_STAGE9.md` уже утверждён — начинать реализацию (план не переутверждать).
2. **T9.0 gate:** объявить `tzdata` в `pyproject.toml`, проверить `ZoneInfo("Europe/Moscow")` на 3.14.
3. Реализовать по задачам T9.1→T9.12 (timing/DST/missed/holidays — чистые функции 100% offline; advisory
   lock; scanner + `app/repositories/schedule_repository.py`; materializer через **существующий Producer**
   с `dedup_key="slot:{channel}:{schedule}:{slot}"`; scheduler-tick; runner+recovery; `app/scheduler/run.py`).
   Reuse Producer/EventLogger/Metrics из `app.workers` (однонаправленно). **Не менять Этап 8.**
4. Тесты offline (чистые функции + логика на фейках) + gated integration (advisory/материализация — RV-8).
5. self-review + ruff + mypy --strict + pytest; `STAGE9_REPORT.md`/`CODE_AUDIT_STAGE9.md`/
   `RELEASE_NOTES_STAGE9.md`; обновить `TECHNICAL_BACKLOG.md` (RV-8) + `TRACEABILITY_STAGE2.md` (§R8.1/5/6/
   10/13/14); README-секция Scheduler; серия коммитов (включая незакоммиченный `TASK_BREAKDOWN_STAGE9.md`)
   + тег `stage-9-scheduler`; стоп на подтверждение.

**Ключевой контекст для реализации Этапа 9:** LEAD_TIME → scheduler кладёт `target_slot` в payload и
создаёт голову пайплайна (`generate_text`) на `slot − lead_time_minutes` (из config; lead применяется,
когда `pipeline.next_stage(type) is not None`), периодические типы — на `slot`. Timezone: хранение UTC,
расчёт в IANA-tz канала; DST: несуществующее локальное время → сдвиг вперёд, неоднозначное → первое
вхождение. Мульти-инстанс: `pg_try_advisory_lock` (один продюсирует) + `dedup_key` (резерв). Recovery:
scheduler stateless, при старте повторный скан; dedup_key не даёт дублей; missed-policy с grace-окном.

---

## Быстрый старт для нового чата
1. Прочитать: `MASTER_SPEC.md` (SoT), `TECHNICAL_BACKLOG.md`, `TRACEABILITY_STAGE2.md`, этот `HANDOFF.md`,
   `TASK_BREAKDOWN_STAGE9.md` (утверждённый план текущего этапа).
2. Проверить состояние: `git log --oneline -5`, `git tag -l`, `git status --short`,
   `.venv/Scripts/pytest.exe -q` (ожидается 70 passed / 4 skipped), `.venv/Scripts/python.exe -m mypy` (Success).
3. Соблюдать: Architecture Freeze, staged delivery, offline-first + RV-статусы, стиль кода (§12 выше),
   стоп на подтверждение владельца между этапами.
4. Выполнять Этап 9 по §14.
