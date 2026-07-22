> ⚠️ **ИСТОРИЧЕСКИЙ ДОКУМЕНТ (superseded).** Авторитетный источник требований — **`MASTER_SPEC.md` v2.0** (корень репозитория). Этот файл — уровень 3 (справочный): сохранён для обоснований и истории решений. При любом расхождении действует MASTER_SPEC; нормативные требования — по ID `R*` в MASTER_SPEC, реализация — в DATABASE_SPEC / API_SPEC / TEST_PLAN.

# Часть 3. Структура репозитория

> Продолжает [Часть 2](02-architecture.md). Реализует модульный монолит: каждый доменный
> модуль — пакет с публичным интерфейсом; запуск через несколько точек входа (api / worker /
> scheduler) поверх общей очереди.

## GLOBAL PRINCIPLE

Проект организован так, чтобы новый разработчик понял его за ≤20 минут. Каждая папка отвечает
за одну область. Бизнес-логика, API, доступ к БД и интеграции не смешиваются в одном модуле.

---

## Правило слоёв (разрешает «двойной дом»)

В черновике бизнес-логика жила и в `services/`, и в доменных пакетах (`images/`, `telegram/`,
`memory/`…). Это двусмысленность. Фиксируем **четыре слоя с односторонней зависимостью
сверху вниз** — каждый файл однозначно попадает в один слой:

| Слой | Где | Что содержит | Чего НЕ содержит |
|---|---|---|---|
| **Presentation** | `api/` | только маршруты, валидация запроса, вызов одного use-case | бизнес-правил, SQL |
| **Application (use-case)** | `services/` | оркестрация: связывает доменные движки + репозитории в сценарий («создать пост для канала X») | доменных правил генерации, прямого SQL |
| **Domain (движки)** | `content/`, `images/`, `llm/`, `telegram/`, `memory/`, `rag/`, `validators/`, `analytics/`, `notifications/` | чистая доменная логика и адаптеры провайдеров | сессии БД, HTTP |
| **Data access** | `repositories/` | только запросы к БД | доменных правил |

Правила зависимостей:

- доменный пакет **никогда** не открывает сессию БД и не знает про HTTP;
- репозиторий **никогда** не содержит доменных правил;
- сервис **компонует** движки + репозитории, но сам не генерирует контент и не пишет SQL;
- зависимости только вниз: `api → services → (domain, repositories) → models/db`. Циклы запрещены.

> Риск слоя `services`: не превратить его ни в тонкий pass-through, ни в «божественный
> оркестратор». Сервис = один бизнес-сценарий, ≤ размера файла из правил ниже.

---

## ROOT STRUCTURE

```text
telegram-ai-platform/
├── app/
├── config/
├── docker/
├── docs/
├── logs/
├── scripts/
├── storage/
├── tests/
├── .env
├── .env.example
├── docker-compose.yml
├── README.md
└── pyproject.toml
```

## APP

```text
app/
├── main.py            # сборка FastAPI-приложения (api entrypoint)
├── api/               # presentation — только роуты
├── core/              # конфиг (Pydantic Settings), логирование, DI, security, rate-limiter
├── db/                # base.py, session.py, migrations/ (Alembic), seed.py
├── models/            # ЕДИНЫЙ дом ORM-моделей (см. ниже)
├── schemas/           # Pydantic-схемы (вход/выход API и use-case)
├── repositories/      # data access
├── services/          # application / use-case
├── scheduler/         # постановка задач по расписанию (scheduler entrypoint)
├── workers/           # обработчики задач очереди (worker entrypoint)
├── llm/               # domain: провайдеры LLM
├── content/           # domain: генерация контента
├── images/            # domain: генерация изображений
├── telegram/          # domain: публикация
├── memory/            # domain: память
├── rag/               # domain: векторный поиск
├── analytics/         # domain: аналитика
├── notifications/     # domain: уведомления
├── validators/        # domain: проверки
├── middleware/        # cross-cutting HTTP
└── utils/             # чистые хелперы без побочных эффектов
```

> **Модели — один дом.** В черновике ORM-модели были и в `app/models/`, и в
> `app/database/models/`. Оставляем **только `app/models/`** (централизованно — чтобы Alembic
> autogenerate видел все таблицы и не ломались связи/циклы). `db/` содержит только `base.py`,
> `session.py`, `migrations/`, `seed.py`.

### api/ (только маршруты)

```text
api/v1/
├── channels.py
├── posts.py
├── images.py
├── scheduler.py
├── users.py
├── analytics.py
└── health.py
```

Каждый роут вызывает ровно один use-case из `services/`.

### services/ (application)

```text
services/
├── channel_service.py
├── post_service.py
├── image_service.py
├── telegram_service.py
├── analytics_service.py
├── memory_service.py
├── scheduler_service.py
└── validation_service.py
```

### models/ (ORM)

```text
models/
├── channel.py    ├── schedule.py   ├── memory.py
├── post.py       ├── prompt.py     ├── user.py
├── image.py      ├── actor.py      └── analytics.py
```

### schemas/ / repositories/

```text
schemas/         repositories/
├── channel.py   ├── post_repository.py
├── post.py      ├── image_repository.py
├── image.py     ├── memory_repository.py
├── user.py      └── channel_repository.py
└── analytics.py
```

### llm/ — единый интерфейс

```text
llm/
├── base_provider.py     # абстрактный интерфейс + фейк
├── claude_provider.py
├── openai_provider.py
├── gemini_provider.py
├── local_provider.py
├── prompt_builder.py
└── token_counter.py
```

Каждая модель реализует единый интерфейс; выбор — фабрикой `get_llm_provider(settings)`.

### content/ · images/ · telegram/ · memory/ · rag/ · validators/

```text
content/                 images/                    telegram/
├── topic_generator.py   ├── providers/             ├── publisher.py
├── headline_generator.py│   ├── nano_banana.py     ├── media_sender.py
├── body_generator.py    │   ├── openai.py          ├── album_sender.py
├── cta_generator.py     │   ├── flux.py            ├── comments.py
├── content_pipeline.py  │   └── ideogram.py        ├── bot.py
├── content_templates.py ├── prompt_builder.py      └── client.py
└── quality_checker.py   ├── image_validator.py
                         ├── similarity_checker.py
memory/                  └── image_pipeline.py
├── embedding.py
├── retriever.py         rag/                        validators/
├── memory_manager.py    ├── vector_store.py         ├── grammar.py   ├── emotion.py
├── conversation_memory.py│ ├── retrieval.py         ├── duplicate.py ├── image.py
└── knowledge_store.py   ├── reranker.py             ├── style.py     ├── language.py
                         ├── similarity.py           ├── readability.py└── quality.py
                         └── indexer.py
```

Новый генератор изображений подключается **добавлением файла в `images/providers/`** и
регистрацией в фабрике — без изменения существующего кода. Каждый валидатор — отдельный модуль.

### analytics/ · notifications/

```text
analytics/               notifications/
├── collector.py         ├── telegram.py
├── engagement.py        ├── email.py
├── dashboard.py         ├── discord.py
├── statistics.py        └── system.py
└── reports.py
```

### workers/ — обработчики очереди

```text
workers/
├── generate_post.py    ├── cleanup.py
├── generate_image.py   ├── backup.py
├── publish_post.py     └── analytics.py
```

> Каждый файл-воркер регистрирует обработчик по `TaskType` в реестре планировщика (см.
> Часть 2, очередь на Postgres). `scheduler/run.py` / `workers/run.py` — точки входа процессов.

---

## STORAGE (локальные данные)

```text
storage/
├── images/
│   ├── generated/
│   ├── actors/
│   └── references/
├── posts/
├── embeddings/     # если кэш векторов вне БД; основной вектор-стор — pgvector
├── cache/
└── exports/
```

---

## CONFIG — согласование с Частью 2

```text
config/
├── settings.py         # дублирует core/? нет — Pydantic Settings живёт в app/core/config.py
├── channels/           # СИД-файлы каналов (bootstrap), НЕ runtime-источник
│   ├── khadidja.yaml
│   ├── mohammed.yaml
│   ├── crypto_vip.yaml
│   └── igaming.yaml
├── global.yaml
├── development.yaml
└── production.yaml
```

> **Профиль канала — источник истины в БД** (Часть 2: редактируется из Admin Panel,
> масштабируется до 1000 каналов транзакционно). YAML-файлы канала — это **seed/import формат**
> для первичного заведения канала (`app/db/seed.py` читает их один раз), а не runtime-хранилище.
> Так снимается противоречие «1000 YAML-файлов vs редактирование из панели».
>
> Настройки приложения (`global/development/production.yaml`, `.env`) грузятся через **Pydantic
> Settings в `app/core/config.py`** — один загрузчик, а не два (`config/settings.py` не дублируем).

---

## DOCS

```text
docs/
├── architecture.md  ├── api.md        ├── images.md
├── database.md      ├── ai.md         └── memory.md
├── deployment.md    ├── telegram.md
```

> Эта спека (`docs/spec/*`) — исходное ТЗ; `docs/*.md` выше — сопровождающая документация кода,
> генерируется по мере реализации.

## TESTS (зеркалит структуру)

```text
tests/
├── api/         ├── memory/
├── services/    ├── analytics/
├── images/      └── validators/
├── telegram/
```

Чистая логика (chunking, backoff, similarity, правила валидации) — юнит-тесты; пути с
БД/сетью — интеграционные, за флагом `RUN_INTEGRATION=1`; доменные движки тестируются через
фейки провайдеров (offline).

## PLUGINS

```text
plugins/
├── new_image_provider/
├── new_llm/
├── new_translator/
└── new_scheduler/
```

> Расширяемость в первую очередь достигается **провайдер-абстракциями + фабриками** внутри
> доменных модулей (это и есть «плагины» без отдельного загрузчика). Полноценный
> runtime-плагин-механизм (entry points / namespace packages) вводим **только когда появится
> реальная потребность в стороннем коде** — не спекулятивно.

---

## КОНВЕНЦИИ

- **File size:** 400–500 строк максимум; больше — разделить.
- **Class size:** 1 класс = 1 ответственность; никаких «универсальных» классов на тысячи строк.
- **Function size:** одна функция — одна задача; ориентир 20–40 строк.
- **Imports:** циклические зависимости запрещены; слой зависит только от нижележащих (см. правило слоёв).
- **Naming:** понятные английские имена — `generate_post()`, `validate_image()`,
  `publish_message()`, `calculate_similarity()`, `create_schedule()`. Никаких `gen()`, `do()`,
  `calc2()`, `imgx()`.
- **Commenting / docstrings:** каждый сервис, каждый публичный метод, каждый pipeline, каждая
  сложная функция.
- **README:** описание проекта · архитектура · схема запуска · переменные окружения · заведение
  нового канала · добавление LLM · добавление генератора изображений · инструкции по обновлению.
