# DATABASE_SPEC.md — Схема данных

**Уровень:** 2 (реализация). **Реализует:** MASTER_SPEC §4 (+ §7/§8/§9/§10 в части таблиц).
**Авторитет:** при конфликте — MASTER_SPEC. Новых требований не вводит.

---

## Конвенции (реализуют §R4.1–R4.4)

- **СУБД:** PostgreSQL 16+; расширения `vector` (pgvector), `pg_trgm`.
- **PK:** `id uuid` — **UUIDv7**, генерируется приложением (§R4.3). Тип колонки `uuid`.
- **Базовые колонки** (§R4.2) на каждой таблице, если не оговорено:
  `created_at timestamptz NOT NULL DEFAULT now()`, `updated_at timestamptz NOT NULL`,
  `deleted_at timestamptz NULL`, `version int NOT NULL DEFAULT 1`.
- **Soft delete:** физическое удаление важных данных запрещено; естественные ключи — partial
  unique `WHERE deleted_at IS NULL` (§R4.4).
- **Платформенные размерности векторов** (§R4.6, константы, смена = миграция+reindex):
  `N_text = 1536` (текстовые эмбеддинги), `N_clip = 512` (CLIP), `N_face = 512` (face-эмбеддинг).
- **Время** — UTC (§R8.6).

## Enums (§R4.11–R4.13)

```sql
CREATE TYPE channel_status AS ENUM ('active','paused','archived');
CREATE TYPE post_status    AS ENUM ('draft','validating','rewriting','ready','scheduled','published','failed','needs_review');
CREATE TYPE task_type      AS ENUM ('generate_text','validate','generate_image','publish','collect_metrics','backup','cleanup','reindex','health_check');
CREATE TYPE task_status    AS ENUM ('pending','running','succeeded','failed','deferred','needs_review','cancelled','dead');
CREATE TYPE user_role      AS ENUM ('owner','admin','editor','analyst','viewer');
CREATE TYPE memory_kind    AS ENUM ('published_post','example','note');
CREATE TYPE severity_level AS ENUM ('debug','info','warning','error','critical');
CREATE TYPE prompt_type    AS ENUM ('system','image','negative','sales','story','morning','evening','other');
```

---

## Таблицы

### channels (§R2.6, R4.7)
| колонка | тип | ограничения |
|---|---|---|
| id | uuid | PK |
| telegram_channel_id | bigint | partial unique |
| username | text | partial unique |
| title, description | text | |
| language | text | NOT NULL (ISO 639-1) |
| country | text | |
| timezone | text | NOT NULL (IANA) |
| status | channel_status | NOT NULL DEFAULT 'active' |
| llm_provider, image_provider | text | NOT NULL |
| default_persona_id | uuid | FK→personas(id) |
| bot_token_ref | text | ссылка на секрет (не сам токен, §R12.2) |
| settings | jsonb | NOT NULL DEFAULT '{}' (GIN) |
+ базовые. `channel.tone/writing_style` **отсутствуют** (§R4.7).

### channel_settings (1:1, §R5/§6 параметры, §Appendix B)
`id` · `channel_id uuid FK UNIQUE` · `temperature numeric` · `max_post_length int` ·
`images_per_post int` · `cta_style text` · `emoji_set jsonb` · `text_format text` ·
`banned_words text[]` · `allowed_topics text[]` · `posts_per_day int` ·
`similarity_threshold numeric(4,3) DEFAULT 0.850` · `humanness_min int DEFAULT 75` ·
`history_window int DEFAULT 500` · `image_window int DEFAULT 30` · `max_rewrites int DEFAULT 3` ·
`image_max_regen int DEFAULT 3` · `lead_time_minutes int DEFAULT 45` ·
`max_context_tokens int` · `epsilon_min numeric(4,3)` · `quality_check jsonb`. NULL = платформенный дефолт.

### personas (§R4.7, R9.12 — текстовый голос)
`id` · `channel_id uuid FK` · `name` · `biography text` · `character text` ·
`manner_of_speech text` · `favorite_words text[]` · `forbidden_expressions text[]` · `goals text` ·
`life_story text` · `audience_relationship text` · `vocabulary jsonb` · `greeting_style text` ·
`farewell_style text` · `storytelling_style text` · `selling_post_rules jsonb` ·
`personal_post_rules jsonb` · `motivational_post_rules jsonb` · `best_examples jsonb` ·
`style_features jsonb` (Style Memory §R9.12) · `status text`. Индекс: `channel_id`.

### actors (§R4.7, R6.1 — визуал)
`id` · `channel_id uuid FK` · `name` · `gender` · `age int` · `height` · `build` ·
`facial_features text` · `eyes` · `hair` · `hair_color` · `nationality` · `ethnicity` ·
`clothing_style` · `appearance_description text` · `prompt_description text` ·
`negative_prompt text` · `reference_images_folder text` (вход генерации, §R6.1) ·
`face_embedding vector(512)` (для проверки соответствия, §R6.7) · `voice` · `status`. Индекс: `channel_id`.

### locations (§R6.3)
`id` · `channel_id uuid FK NULL` · `name` · `description text` · `references jsonb` ·
`restrictions jsonb` · `usage_count int DEFAULT 0` · `last_used_at timestamptz`. Индекс: `channel_id`.

### posts (§R5, R7)
| колонка | тип | |
|---|---|---|
| id | uuid | PK |
| channel_id | uuid | FK, NOT NULL |
| persona_id | uuid | FK |
| title, body | text | |
| language | text | |
| topic_id | uuid | FK→topics |
| emotion | text | |
| cta_id | uuid | FK→cta |
| status | post_status | NOT NULL DEFAULT 'draft' |
| quality_score, readability_score, duplicate_score | numeric | |
| memory_id | uuid | FK→memory (носитель текст-вектора) |
| image_id | uuid | FK→images |
| telegram_message_id | bigint | |
| scheduled_at, published_at | timestamptz | |
Индексы: `(channel_id,status)`, `(channel_id, published_at DESC)`, `topic_id`,
`to_tsvector(body)` GIN (FTS §R9.11).

### post_history (§R7.9 — append-only)
`id` · `post_id uuid FK` · `version_no int` · `body text` · `changed_by uuid FK→users` ·
`change_reason text` · `created_at`. Без soft delete (журнал).

### images (§R6)
`id`(UUIDv7) · `channel_id uuid FK` · `actor_id uuid FK` · `location_id uuid FK` · `prompt text` ·
`negative_prompt text` · `provider text` · `seed bigint` · `resolution text` · `style` ·
`camera` · `lighting` · `composition` · `storage_path text` (ключ объекта, §R6.8) ·
`phash text` · `embedding vector(512)` (CLIP) · `quality_score numeric` · `status text` ·
`published_at timestamptz`. Индексы: `phash`, HNSW на `embedding`, `(channel_id, published_at DESC)`.

### image_history (§R6.5 — все генерации)
`id`(UUIDv7) · `image_id uuid FK` · `attempt int` · `prompt text` · `seed bigint` · `provider text` ·
`result text` · `created_at`.

### prompts (§R10.6 — версионируемые)
`id` · `type prompt_type` · `text text` · `version int` · `author uuid FK→users` · `model text` ·
`result text` · `created_at`. Правка = новая версия.

### schedules (§R8)
`id` · `channel_id uuid FK` · `cron text` **или** (`day_of_week int`,`time_local time`) ·
`timezone text` · `slot_name text` · `task_type task_type` · `enabled bool DEFAULT true`. Индекс: `channel_id`.

### tasks (§R8 — ОЧЕРЕДЬ, backbone)
| колонка | тип | |
|---|---|---|
| id | uuid | PK (UUIDv7) |
| channel_id | uuid | FK |
| type | task_type | NOT NULL |
| status | task_status | NOT NULL DEFAULT 'pending' |
| priority | int | NOT NULL DEFAULT 100 (меньше=раньше) |
| payload | jsonb | NOT NULL DEFAULT '{}' |
| attempts | int | NOT NULL DEFAULT 0 |
| run_at | timestamptz | NOT NULL DEFAULT now() |
| locked_by | text | id воркера |
| locked_at | timestamptz | |
| dedup_key | text | partial unique (идемпотентность §R7.4) |
| slot_datetime | timestamptz | для идемпотентности слота (§R8.10) |
| schedule_id | uuid | FK→schedules NULL |
| last_error | text | |
Индексы: `(status, run_at, priority) WHERE status='pending'` (разбор);
`UNIQUE(channel_id, schedule_id, slot_datetime) WHERE deleted_at IS NULL` (§R8.10);
`UNIQUE(dedup_key) WHERE deleted_at IS NULL`.

### memory (§R9 — носитель текст-векторов)
`id`(UUIDv7) · `channel_id uuid FK` · `text text` · `embedding vector(1536)` ·
`kind memory_kind` · `source text` · `weight numeric DEFAULT 1.0` · `created_at`.
Индексы: HNSW на `embedding`, `(channel_id, kind, created_at)`.

### topics / cta (справочники + метрики §R5.4)
topics: `id`·`channel_id uuid FK NULL`·`name`·`popularity numeric`·`frequency int`·
`last_used_at`·`success_rate numeric`.
cta: `id`·`channel_id uuid FK NULL`·`type text`·`conversion numeric`·`usage_count int`·`success_rate numeric`.

### analytics_snapshots (§R4.8 — временной ряд)
`id`(UUIDv7) · `post_id uuid FK` · `channel_id uuid FK` · `captured_at timestamptz NOT NULL` ·
`views bigint NULL` · `likes bigint NULL` · `comments bigint NULL` · `shares bigint NULL` ·
`ctr numeric NULL` · `er numeric NULL` · `subscriber_delta int` · `conversion numeric`.
Индекс: `(post_id, captured_at DESC)`. Кандидат на партиции по месяцу (§R4.15).
> `views/ctr/er` — NULLABLE: недоступны на Bot API (§R7.3), заполняются только при MTProto-адаптере.

### api_usage / image_usage (§R5.12/R11.8 — high volume, UUIDv7)
api_usage: `id`·`channel_id uuid FK`·`model text`·`cost_usd numeric`·`prompt_tokens int`·
`completion_tokens int`·`latency_ms int`·`error text`·`created_at`.
image_usage: `id`·`channel_id uuid FK`·`provider text`·`cost_usd numeric`·`latency_ms int`·
`seed bigint`·`prompt text`·`created_at`. Обе — кандидаты на партиции по месяцу.

### errors / logs (§R12.9)
errors: `id`(UUIDv7)·`module text`·`stack_trace text`·`severity severity_level`·
`resolved bool DEFAULT false`·`created_at`.
logs: `id`(UUIDv7)·`event text`·`channel_id uuid`·`task_id uuid`·`severity severity_level`·
`payload jsonb`·`created_at`. Секреты маскированы (§R12.2).

### users (§R10.5)
`id`·`email text` (partial unique)·`role user_role NOT NULL`·`password_hash text`·`mfa_secret_ref text`·`status text`.

### documents / document_chunks (§R9.3 — KB, аддендум #32)
documents: `id`·`source text`·`author text`·`doc_type text`·`language text`·
`channel_id uuid FK NULL`·`persona_id uuid FK NULL`·`active_version int`·`tags text[]` + базовые.
document_chunks: `id`·`document_id uuid FK`·`version int`·`chunk_index int`·`text text`·
`embedding vector(1536)`·`metadata jsonb`. Индекс: HNSW на `embedding`, `(document_id, version)`.

### audit_log / config_versions (§R10.8 — аддендум #37)
audit_log: `id`(UUIDv7)·`actor_user_id uuid FK`·`action text`·`entity text`·`entity_id uuid`·
`before jsonb`·`after jsonb`·`created_at`.
config_versions: `id`·`author uuid FK→users`·`description text`·`snapshot jsonb`·`created_at`.

---

## Индексная сводка (§R4.14)
btree на всех FK, `status`, `published_at`, `run_at` · partial unique на естественных ключах
`WHERE deleted_at IS NULL` · GIN на `settings/payload/metadata` и FTS (`to_tsvector`)+`pg_trgm` ·
HNSW (косинус) на `memory.embedding`, `images.embedding`, `document_chunks.embedding`.

## Миграции (§R12.6)
Только Alembic. Горячие таблицы (`memory`, `analytics_snapshots`, `api_usage`, `image_usage`,
`logs`) — **expand-contract** + `CREATE INDEX CONCURRENTLY`. Enum-расширения (`task_status`,
`user_role`) — отдельными миграциями. Ручное изменение схемы на проде запрещено.

## Целостность / безопасность
Транзакции · rollback · оптимистичная блокировка (`version`, §R4.2) · async connection pool
(ограничен; pgbouncer при масштабе) · retry (§Appendix B) · БД least-privilege роль (§R12.2).

## Трассировка → MASTER_SPEC
Все таблицы = §R4.10. Ключевые инварианты: §R4.5(вектор-колонка), §R4.6(размерность), §R4.7
(persona≠actor), §R4.8(analytics-ряд), §R7.4(dedup_key), §R8.10(идемпотентность слота),
§R9.2(изоляция канала — на уровне запросов, не схемы).
