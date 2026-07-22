> ⚠️ **ИСТОРИЧЕСКИЙ ДОКУМЕНТ (superseded).** Авторитетный источник требований — **`MASTER_SPEC.md` v2.0** (корень репозитория). Этот файл — уровень 3 (справочный): сохранён для обоснований и истории решений. При любом расхождении действует MASTER_SPEC; нормативные требования — по ID `R*` в MASTER_SPEC, реализация — в DATABASE_SPEC / API_SPEC / TEST_PLAN.

# Часть 4. Проектирование базы данных

> Продолжает [Часть 3](03-repository-structure.md). Модель данных фиксируется здесь целиком,
> чтобы не переделывать миграциями. Параметры из [Части 1](01-system-prompt.md) становятся
> колонками `channel_settings`. Таблица `tasks` — это очередь из [Части 2](02-architecture.md).

## СУБД

Только **PostgreSQL 16+**. Расширения: `pgvector` (эмбеддинги), `pg_trgm` (нечёткий/FTS),
`uuid` через приложение (UUIDv7, см. ниже). Доступ: SQLAlchemy 2.x async engine + async session,
миграции — Alembic.

Типовой инструментарий: UUID PK · JSONB · GIN/BTREE индексы · Full-Text Search · HNSW для векторов.

---

## Пять решений уровня схемы (фиксируем до реализации)

### 1. Эмбеддинги — один дом, а не три

В черновике вектор хранился в `memory.embedding`, в отдельной `embeddings` и через
`posts.embedding_id`. Это тройное хранение и риск рассинхрона размерностей.

**Решение:** вектор — это `vector(N)`-**колонка на строке, которой принадлежит смысл**:

- текстовая семантика поста → строка в `memory` с колонкой `embedding vector(1536)`;
- визуальная семантика изображения → `images.embedding vector(512)` (CLIP).

Отдельная generic-таблица `embeddings` **не создаётся**. `posts` не хранит вектор — у поста
есть связь с его `memory`-записью. Если позже понадобится кросс-провайдерная дедупликация —
добавим кэш `embedding_cache(content_hash → vector)`, но не generic-таблицу-джоин.

### 2. Размерность вектора фиксирована на уровне платформы

ANN-индекс pgvector строится на колонке **одной размерности**. Разные модели дают разные
размерности (OpenAI `text-embedding-3-small` = 1536, `-large` = 3072; CLIP = 512). Значит
**нельзя выбирать embedding-модель на канал** — иначе индекс несогласован.

**Решение:** embedding-модель (и размерность) — **платформенная константа**, не поле канала.
Смена модели = миграция колонки + переиндексация всего корпуса (осознанная операция, не
переключатель в панели). Это фиксируется в конфиге приложения, а не в `channel_settings`.

### 3. Первичные ключи — UUIDv7 (time-ordered)

Таргет — «миллионы записей памяти, сотни тысяч изображений». Случайный **UUIDv4 фрагментирует
btree-индекс** и раздувает запись на insert-heavy таблицах.

**Решение:** PK — **UUIDv7** (монотонный по времени) через приложение, минимум для
insert-heavy таблиц: `memory`, `images`, `api_usage`, `image_usage`, `logs`, `errors`,
`tasks`, `analytics_snapshots`. Остальным тоже UUIDv7 — единообразно.

### 4. Soft delete совместим с UNIQUE только через partial index

`deleted_at` + `UNIQUE(telegram_channel_id)` конфликтуют: удалённая запись блокирует повтор.

**Решение:** все естественные ключи — **partial unique**: `UNIQUE(...) WHERE deleted_at IS NULL`.

### 5. Оптимистичная блокировка

Колонка `version int` на каждой таблице → SQLAlchemy `version_id_col`. Конкурентная запись из
воркеров и панели не затирает друг друга молча.

---

## Базовые колонки (каждая таблица)

`id UUIDv7 PK` · `created_at timestamptz NOT NULL default now()` ·
`updated_at timestamptz NOT NULL` (триггер/ORM) · `deleted_at timestamptz NULL` (soft delete) ·
`version int NOT NULL default 1`. Физическое удаление важных данных запрещено.

---

## Таблицы

### channels (ядро)

| колонка | тип | примечание |
|---|---|---|
| telegram_channel_id | bigint | partial unique |
| username | text | partial unique |
| title, description | text | |
| language | text | ISO 639-1 |
| country, timezone | text | IANA tz |
| status | enum `channel_status` | `active/paused/archived` |
| llm_provider, image_provider | text | ключ фабрики |
| default_persona_id | uuid FK → personas | голос по умолчанию |
| settings | jsonb | оперативные оверрайды (GIN) |

> `tone` / `writing_style` из черновика **не хранятся здесь** — их богатый дом это `personas`
> (решение против «стиля в трёх местах»). В `channels` остаётся только `default_persona_id`.

### channel_settings (1:1 с channel)

Параметры из Части 1 как **переопределяемые колонки** (NULL = взять платформенный дефолт):

`temperature`, `max_post_length`, `images_per_post`, `cta_style`, `emoji_set jsonb`,
`text_format`, `banned_words text[]`, `allowed_topics text[]`, `posts_per_day`,
`similarity_threshold numeric(4,3)` (деф. 0.85), `humanness_min int` (деф. 75),
`history_window int` (деф. 500), `image_window int` (деф. 30), `max_rewrites int` (деф. 3),
`quality_check jsonb`.

### personas (текстовый голос — ДОБАВЛЕНО из твоего дополнения)

Ядро письма канала. Отделено от `actors` (визуал):

`channel_id FK` · `name` · `biography` · `character` · `manner_of_speech` ·
`favorite_words text[]` · `forbidden_expressions text[]` · `goals` · `life_story` ·
`audience_relationship` · `vocabulary jsonb` · `greeting_style` · `farewell_style` ·
`storytelling_style` · `selling_post_rules jsonb` · `personal_post_rules jsonb` ·
`motivational_post_rules jsonb` · `best_examples jsonb` (few-shot образцы) · `status`.

> **Persona ≠ Actor.** Persona управляет генерацией **текста** (от лица человека). Actor
> управляет генерацией **изображений** (внешность). Канал: одна персона по умолчанию + N актёров.

### actors (визуальная личность)

`channel_id FK` · `name` · `gender` · `age` · `description` · `nationality` · `ethnicity` ·
`hair` · `eyes` · `clothing_style` · `prompt_description` · `negative_prompt` ·
`reference_images_folder` · `voice` · `status`. Актёры **никогда не смешиваются между
каналами** — все запросы скоупятся `channel_id`.

### locations

`channel_id FK` (nullable — общие/канальные) · `name` · `description` · `references jsonb` ·
`restrictions jsonb`. Примеры: офис, дом, пляж, кафе, спортзал, машина, аэропорт, горы,
мечеть, ресторан.

### posts (контент)

`channel_id FK` · `persona_id FK` · `title` · `body` · `language` · `topic_id FK` ·
`emotion` · `cta_id FK` · `status enum post_status` (`draft/validating/rewriting/ready/scheduled/published/failed`) ·
`quality_score` · `readability_score` · `duplicate_score` · `memory_id FK` (носитель вектора) ·
`image_id FK` · `scheduled_at` · `published_at`. Индексы: `(channel_id, status)`,
`(channel_id, published_at desc)`, `topic_id`.

### post_history

Неизменяемый журнал редакций: `post_id FK` · `version_no` · `body` · `changed_by` ·
`change_reason` · `created_at`. Старые версии не теряются (append-only).

### images

`channel_id FK` · `actor_id FK` · `location_id FK` · `prompt` · `negative_prompt` ·
`provider` · `seed bigint` · `resolution` · `style` · `camera` · `lighting` · `composition` ·
`storage_path` · `phash text` (perceptual hash) · `embedding vector(512)` (CLIP) ·
`quality_score` · `status` · `published_at`. Индексы: `phash`, HNSW на `embedding`,
`(channel_id, published_at desc)`.

### image_history

Все генерации, включая неопубликованные: `image_id FK` · `attempt` · `prompt` · `seed` ·
`provider` · `result` · `created_at`.

### prompts

`type enum` · `text` · `version` · `author` · `model` · `result` · `created_at`.

### schedules

`channel_id FK` · `day_of_week`/`cron` · `time`/`timezone` · `slot_name` (утренний/ночной) ·
`task_type` · `enabled`. Планировщик читает и ставит `tasks`.

### tasks (ОЧЕРЕДЬ — backbone пайплайна)

Postgres как source of truth, разбор через `FOR UPDATE SKIP LOCKED`:

| колонка | тип | назначение |
|---|---|---|
| channel_id | uuid FK | скоуп |
| type | enum `task_type` | `generate_post/generate_image/validate/publish/collect_metrics/retry/cleanup/backup` |
| status | enum `task_status` | `pending/running/succeeded/failed/deferred` |
| priority | int | меньше = раньше |
| payload | jsonb | вход стадии |
| attempts | int | против `MAX_RETRIES` (Часть 1) |
| run_at | timestamptz | отложенный запуск / backoff |
| locked_by | text | id воркера |
| locked_at | timestamptz | для SKIP LOCKED |
| dedup_key | text | partial unique — идемпотентность стадии |
| last_error | text | |

Индекс разбора: `(status, run_at, priority) WHERE status='pending'`.

> Добавление нового `task_type` = миграция enum (осознанно). Прямые вызовы (напр. ingestion)
> задачей не оформляем, чтобы не плодить enum-миграции.

### memory (RAG-память — носитель текстовых векторов)

`channel_id FK` · `text` · `embedding vector(1536)` · `kind enum` (`published_post/example/note`) ·
`source` · `weight numeric` · `created_at`. Индекс: HNSW на `embedding`, btree `(channel_id, kind, created_at)`.

### topics / cta (справочники + метрики)

topics: `name` · `popularity` · `frequency` · `last_used_at` · `success_rate`.
cta: `type` · `conversion` · `usage_count` · `success_rate`.

### analytics_snapshots (ВРЕМЕННОЙ РЯД, не одна строка)

Метрики меняются во времени → снимок на пост во времени, а не единственная строка:

`post_id FK` · `channel_id FK` · `captured_at` · `views` · `likes` · `comments` · `shares` ·
`ctr` · `er` · `subscriber_delta` · `conversion`. Индекс `(post_id, captured_at desc)`.
Кандидат на **партиционирование по месяцу** при росте.

### api_usage / image_usage (учёт стоимости — high volume)

api_usage: `channel_id` · `model` · `cost_usd numeric` · `prompt_tokens` · `completion_tokens` ·
`latency_ms` · `error` · `created_at`.
image_usage: `channel_id` · `provider` (nano_banana/flux/openai/ideogram) · `cost_usd` ·
`latency_ms` · `seed` · `prompt` · `created_at`. Обе — UUIDv7, кандидаты на партиционирование по месяцу.

### errors / logs

errors: `module` · `stack_trace` · `severity enum` · `resolved bool` · `created_at`.
logs: `event enum` (startup/publish/error/delete/auth) · `channel_id` · `payload jsonb` · `created_at`.

### users (панель)

`email` (partial unique) · `role enum` (`owner/admin/viewer`) · `password_hash` · `status`.
Секреты/хэши никогда не логируются.

---

## Индексы (сводно)

- btree на всех FK, `status`, `published_at`, `run_at`;
- partial unique на естественных ключах `WHERE deleted_at IS NULL`;
- GIN на `settings jsonb`, `payload jsonb`, и на FTS-полях (`to_tsvector`) + `pg_trgm` для нечёткого;
- HNSW на `memory.embedding` и `images.embedding` (косинус);
- составной `(channel_id, published_at desc)` под ленты/аналитику по каналу.

## Поиск

По теме · словам (FTS/trgm) · актёру · изображению (phash/вектор) · эмоции · дате · каналу —
покрыто индексами выше.

## Дедупликация

- **Текст:** взять эмбеддинг → сравнить с окном `history_window` (косинус) → при
  `≥ similarity_threshold` перегенерировать (Часть 1).
- **Изображение:** сравнить `phash` (быстрый префильтр) + CLIP-вектор (косинус) → при
  превышении порога перегенерировать.

## Обслуживание (еженедельно)

Очистка кэша · архивация логов · сжатие изображений · `VACUUM` · `ANALYZE`. Оформляется как
`cleanup`-задача в очереди.

## Резервное копирование (ежедневно)

PostgreSQL (`pg_dump`/PITR) · изображения · конфиги · промпты · память · вектора. Механика —
инфраструктура (Часть 12), не runtime-таблица.

## Безопасность БД

Transactions · rollback · optimistic locking (`version`) · connection pool (async, ограничен) ·
retry policy (Часть 1). Секреты — только через env (Часть 13).

## Цель по производительности

1000 каналов · 100 публикаций/час · десятки тысяч постов · сотни тысяч изображений · миллионы
записей памяти — без деградации. Обеспечивается: UUIDv7, HNSW, партиционирование
insert-heavy таблиц по времени, партиальные индексы, pgbouncer/пул. **Реальный потолок — не
БД, а лимиты внешних API** (Часть 2): rate-limiter обязателен.
