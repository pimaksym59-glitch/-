# TASK_BREAKDOWN — Stage 13 (Memory + Knowledge + RAG Foundation)

**Требует утверждения перед реализацией.** Цель (§R13.1 шаг 13, §R9): **storage-agnostic RAG-фундамент
+ независимые подсистемы Memory и Knowledge** — Protocol-абстракции хранилищ, retrieval-pipeline (не
зависит от бэкенда), отдельные ranking и context-assembly, embedding **только через Provider Protocols
Этапа 11**, независимый chunking, фильтры/similarity, seam'ы для гибридного поиска/кэша/метрик/логов, и
**детерминированные фейки**. Реализуют context-порты `MemoryContextSource`/`KnowledgeContextSource`,
объявленные AI-движком на Этапе 12. **Никаких конкретных pgvector/FAISS/Qdrant; никаких реальных
embedding-вызовов и поисковых запросов; никакой бизнес-логики.** Architecture Freeze ACTIVE; SoT — MASTER_SPEC.

## Размещение (по §R3.1, owner req 1)

Две **независимые** доменные подсистемы + общий нейтральный retrieval-kernel:
- **`app/rag/`** — **общий storage-agnostic retrieval-фундамент** (нейтральный kernel: DTO, Store-
  протоколы, retrieval/strategy, ranking, assembly, similarity, embedding-integration, chunking,
  filters, hybrid/cache/observability seam'ы, фейки) **и Knowledge Base** (documents/chunks + ingestion
  + versioning + `KnowledgeContextSource`). Generic-часть доменных пакетов не импортирует; зависит только
  «наружу» (app/llm EmbeddingProvider, app/core, app/content types для ContextItem).
- **`app/memory/`** — **Memory-подсистема** (Content/Persona/Channel/Global + Style Memory, §R9.1/R9.12):
  memory-store + `MemoryContextSource`. Использует retrieval-kernel из `app/rag`; **не** импортирует
  Knowledge-специфику → Memory ⊥ Knowledge (подсистемы независимы друг от друга).
- **`app/services/rag.py`** — composition: собирает Memory/Knowledge источники (фейки + embedding-провайдер
  Этапа 11) и передаёт их в composition AI-движка (Этап 12). AI Engine **не меняется** (потребляет порты).

Направление: `services → (app/memory, app/rag) → app/llm/app/content/app/core`. Guard слоёв — зелёный.

---

## ⚠️ Ограничение среды (нет реальных embedding-API и бэкендов)

По требованию — не имитировать runtime. **Три статуса:**
- **Implemented / Statically Verified (offline):** весь Этап 13 offline на `FakeEmbeddingProvider`
  (Этап 11) + in-memory детерминированных фейк-хранилищах — DTO, Store-протоколы, chunking, similarity
  (чистая косинусная математика), retrieval/ranking/assembly-pipeline, filters (channel hard-filter),
  Memory/Knowledge источники, ingestion-логика. Покрытие ~100% (чистые функции + фейки).
- **Runtime Verification Pending (RV-12):** реальные **pgvector**-хранилища, реальные embedding-вызовы,
  фактический семантический/keyword/hybrid-поиск и reranking под живыми PostgreSQL + embedding-API.
  Интеграционные тесты пишутся и **пропускаются** без сервисов.

## Особые требования владельца (1–16)
1 Memory/Knowledge независимы · 2 retrieval-pipeline не зависит от хранилища · 3 embedding только через
Provider Protocols Этапа 11 · 4 без конкретных pgvector/FAISS/Qdrant · 5 chunking — независимый модуль ·
6 ranking отделён от retrieval · 7 context-assembly отделён от retrieval · 8 hybrid-search — только seam ·
9 cache — только infra-seam · 10 metrics/logging — только hooks · 11 без реальных embedding-вызовов ·
12 без реальных запросов к бэкендам · 13 фейки Memory/Knowledge полностью детерминированы · 14 все
интерфейсы — Protocol · 15 без бизнес-логики в Memory/RAG · 16 три статуса.

---

## Последовательность задач

### T13.0 — Зависимости + gate
- **Новых зависимостей нет** (фейки + чистая математика; embedding — фейк Этапа 11). Бэкенд-библиотеки
  (pgvector-драйвер уже в стеке для БД, но **не** используется здесь) не импортируются в коде Этапа 13.
- **Критерий:** нет новых пакетов; вендорских/бэкенд-вызовов нет (grep); при нужде — СТОП+отчёт.

### T13.1 — RAG DTO (Chunk / Document / Metadata) (`app/rag/types.py`)
- Dataclass'ы: `Metadata` (channel_id, doc_type, version, tier, extra), `Document` (id, text, metadata),
  `Chunk` (id, document_id, ordinal, text, metadata, embedding?), `RetrievalQuery` (text, filters, limit),
  `ScoredChunk` (chunk, score), `RetrievalResult` (items, timings). **DTO, не ORM** (storage-agnostic).
- **Критерий:** типизированы, неизменяемы; независимы от `app/models`/pgvector; unit.

### T13.2 — Similarity interface (`app/rag/similarity.py`)
- `Similarity` Protocol + `CosineSimilarity` (чистая детерминированная математика над векторами).
- **Критерий:** косинус корректен/детерминирован; unit (ортогональные/коллинеарные/нормировка).

### T13.3 — Embedding integration (`app/rag/embedding.py`, §R2.10/§R9.6)
- `Embedder` адаптер поверх Stage-11 `EmbeddingProvider`: `embed_query`/`embed_chunks`; платформенная
  размерность (§R4.6/§R9.6) из config. **Реальные вызовы — только с провайдером; иначе фейк** (§R2.10).
- **Критерий:** батч-эмбеддинг через провайдер; фейк детерминирован; unit (без реальных API — req 11).

### T13.4 — Chunking (`app/rag/chunking.py`, §R9.5) — независимый модуль
- `Chunker` Protocol + `SemanticBlockChunker`: делит по смысловым блокам (абзацы/предложения), сливает
  под целевой размер окна embedding-модели (эвристика через `TokenEstimator`). **Не по символам.**
- **Критерий:** независим (req 5), детерминирован; unit (границы блоков/целевой размер/пустой ввод).

### T13.5 — Store abstractions (`app/rag/stores.py`, `app/memory/stores.py`)
- **Storage-agnostic Protocol'ы** (req 2/4): `VectorStore` (upsert/search по вектору+фильтрам),
  `DocumentStore`/`ChunkStore` (KB), `MemoryStore` (записи памяти). **Никаких pgvector/FAISS.**
- **Критерий:** протоколы типизированы; фейки-in-memory реализуют их; unit.

### T13.6 — Search filters (`app/rag/filters.py`, §R9.2/§R9.7)
- `SearchFilter` + применение: **channel hard-filter** (§R9.2; Global memory — исключение §R9.1),
  doc-type, **active-version** (§R9.7/R9.10). Фильтры применяются **до** ранжирования.
- **Критерий:** channel-изоляция обязательна; unit (чужой канал отсечён; версия/тип).

### T13.7 — Retrieval Pipeline + Strategy (`app/rag/retrieval.py`, §R9.7/§R9.11)
- **Storage-agnostic** `RetrievalPipeline`: query→embed→filter→store.search→ScoredChunk (через
  инъектированный `VectorStore`, не зная бэкенда). `RetrievalStrategy` Protocol: `SemanticStrategy`
  (сейчас) + **hybrid seam** (vector+keyword/RRF, §R9.11 — **не реализуем**, req 8).
- **Критерий:** pipeline не зависит от хранилища; семантический путь offline на фейке; hybrid — seam; unit.

### T13.8 — Ranking pipeline (`app/rag/ranking.py`, §R9.7) — отдельно от retrieval (req 6)
- `Ranker` Protocol + `ScoreRanker` (сорт по score) + **rerank/RRF seam** (для hybrid; не реализуем).
- **Критерий:** ranking изолирован от retrieval; детерминированная сортировка; unit.

### T13.9 — Context Assembly (`app/rag/assembly.py`, §R9.8) — отдельно от retrieval (req 7)
- `ContextAssembler`: ranked chunks → `ContextItem` (Этап 12) под токен-бюджет (`TokenEstimator`),
  few-shot K=3–5 (§R9.8). **Мост к context-портам AI-движка.**
- **Критерий:** ≤ бюджета; детерминированное усечение; unit.

### T13.10 — Cache seam + Metrics/Logging hooks (`app/rag/cache.py`, `app/rag/observability.py`)
- `CacheSeam` Protocol + no-op (req 9); `MetricsHook`/`LoggingHook` (reuse observability) — на запрос:
  время поиска, найдено/использовано, время сборки, объём контекста (§R9.13). **Только seam'ы/hooks.**
- **Критерий:** no-op по умолчанию; hooks вызываются в точках; unit.

### T13.11 — Fakes (детерминированные) (`app/rag/fakes.py`, `app/memory/fakes.py`)
- In-memory `FakeVectorStore`/`FakeDocumentStore`/`FakeChunkStore`/`FakeMemoryStore`; используют
  `CosineSimilarity` + `FakeEmbeddingProvider`. **Полностью детерминированы, offline** (req 13).
- **Критерий:** детерминизм (без random/времени); реализуют протоколы; unit.

### T13.12 — Memory subsystem (`app/memory/`, §R9.1/§R9.12)
- Уровни памяти как **scope-данные** (Global/Channel/Persona/Content); `StyleFeatures` DTO (jsonb-признаки,
  §R9.12 — **признаки, не тексты**); `MemoryContextSource` impl (few-shot из памяти через retrieval-kernel).
- **Критерий:** реализует порт Этапа 12; Memory ⊥ Knowledge; без бизнес-логики; unit.

### T13.13 — Knowledge subsystem (`app/rag/knowledge.py`, §R9.3/§R9.4/§R9.10)
- Ingestion-pipeline (§R9.4: text→clean→chunk→embed→index→metadata — **прямой вызов, не задача**);
  versioning seam (§R9.10: новая версия индексируется, старая — active-flag); `KnowledgeContextSource`
  impl (relevant chunks через retrieval-kernel).
- **Критерий:** реализует порт Этапа 12; ingestion детерминирован offline; versioning — seam; unit.

### T13.14 — Composition + DI (`app/services/rag.py`)
- `build_memory_source(settings, ...)` / `build_knowledge_source(settings, ...)` — собирают источники с
  embedding-провайдером (factory Этапа 11) + фейк-хранилищами; интеграция в `build_ai_engine` (Этап 12)
  без изменения движка. Опц. DI-seam в `app/api/deps.py`.
- **Критерий:** источники собираются offline; переопределяемо; AI-движок работает с реальными портами; unit.

### T13.15 — Tests (offline)
- `tests/rag/*` — types, similarity, embedding(fake), chunking, stores(fake), filters(channel-isolation),
  retrieval(semantic/hybrid-seam), ranking, assembly, cache/observability, ingestion, knowledge-source.
- `tests/memory/*` — memory-store, style-features, memory-source.
- `tests/services/test_rag.py` — composition + интеграция с AI-движком (few-shot реально приходит).
- **Integration (за `RUN_INTEGRATION=1`+PG/embeddings, не запускается):** pgvector-store, реальные
  embeddings, semantic/keyword/hybrid-поиск — **RV-12 Pending**.
- **Критерий:** offline зелёные ~100%; `mypy --strict` без `type: ignore`; guard зелёный; интеграционные skip.

### T13.16 — Reports + закрытие
- `STAGE13_REPORT.md` (+«Архитектурная проверка»), `CODE_AUDIT_STAGE13.md`, `RELEASE_NOTES_STAGE13.md`;
  обновить `TECHNICAL_BACKLOG.md` (RV-12 RAG-runtime; keyword/hybrid/reranking/cache/versioning/retention
  — как расширения), `TRACEABILITY_STAGE2.md` (§R9.* — три статуса). README — секция Memory/RAG. Серия
  коммитов + тег `stage-13-rag`.
- **Критерий:** ruff/mypy-strict/pytest зелёные (offline); секреты не в git; тег на финале.

---

## Создаваемые/изменяемые файлы

| Файл | Действие |
|---|---|
| `app/rag/{types,similarity,embedding,chunking,stores,filters,retrieval,ranking,assembly,cache,observability,fakes,knowledge}.py` | новые — retrieval-kernel + KB |
| `app/rag/__init__.py` | обновить (экспорт) |
| `app/memory/{stores,style,source,fakes}.py` | новые — Memory-подсистема |
| `app/memory/__init__.py` | обновить (экспорт) |
| `app/services/rag.py` | новый — composition Memory/Knowledge источников |
| `app/services/ai.py` | edit — принимать реальные источники (без изменения движка) |
| `app/api/deps.py` | edit — (опц.) DI-seam источников |
| `tests/rag/*`, `tests/memory/*`, `tests/services/test_rag.py` | новые — offline |
| `README.md` | edit — секция Memory/RAG |
| `STAGE13_REPORT.md`, `CODE_AUDIT_STAGE13.md`, `RELEASE_NOTES_STAGE13.md` | новые |
| `TECHNICAL_BACKLOG.md`, `TRACEABILITY_STAGE2.md` | обновление (живые) |

## Новые зависимости
**Нет.** Embedding — через Stage-11 провайдер (фейк offline); similarity — чистая математика; chunking —
эвристика. pgvector/FAISS/Qdrant — **не** используются (RV-12).

## Реализуемые требования MASTER_SPEC
§R9.1 (уровни памяти — scope) · §R9.2 (channel hard-filter) · §R9.3 (KB ≠ Memory — независимы) ·
§R9.4 (ingestion — прямой вызов) · §R9.5 (semantic chunking) · §R9.6 (платформенная размерность) ·
§R9.7 (retrieval + reranking, hard-filters до ранга) · §R9.8 (context assembly ≤ токенов, few-shot K) ·
§R9.10 (versioning — active-version seam) · §R9.11 (search modes — semantic; keyword/hybrid seam) ·
§R9.12 (Style Memory — признаки) · §R9.13 (observability hooks) · §R5.2 (few-shot в порты AI-движка) ·
§R4.5/§R4.6 (эмбеддинги на владельце, платформенная размерность) · §R2.10 (embedding через провайдер) ·
§R3.1 (домен, без БД-сессии/HTTP/бизнес-правил) · §R3.8 (расширяемые stores/strategies/rankers).

## Риски

| # | Риск | Уровень | Митигация |
|---|---|---|---|
| R1 | Нет реальных бэкендов/embeddings → retrieval не проверяется под нагрузкой | 🟠 | offline на фейках ~100%; реальный pgvector/embeddings — RV-12 |
| R2 | Keyword/hybrid/reranking — только seam'ы | 🟡 | Protocol'ы + RRF-seam + docstring'и; реализация — при реальных бэкендах |
| R3 | Независимость Memory/Knowledge vs общий kernel | 🟢 | обе используют нейтральный retrieval-kernel; друг друга не импортируют |
| R4 | Storage-agnosticism | 🟢 | Store-протоколы + DTO, развязаны от ORM/pgvector; реальные store — RV-12 |
| R5 | Качество semantic chunking (vs char) | 🟡 | блочный chunker (не символы) + `TokenEstimator`; окно-aware chunking — позже |
| R6 | Channel-изоляция должна быть везде (§R9.2) | 🟠 | hard-filter в каждом запросе; тест «чужой канал отсечён» |
| R7 | Согласованность размерности эмбеддингов (§R9.6) | 🟢 | платформенная константа из config; фейк использует её |
| R8 | Бизнес-логика в RAG | 🟢 | только механизмы; уровни памяти/style-признаки — данные (req 15) |

---

## Публичные контракты Этапа 13

- **Protocol (req 14):** `Similarity` · `Embedder` (адаптер над `EmbeddingProvider`) · `Chunker` ·
  `VectorStore` · `DocumentStore` · `ChunkStore` · `MemoryStore` · `RetrievalStrategy` · `Ranker` ·
  `ContextAssembler` (или конкретный класс) · `CacheSeam` · `MetricsHook`/`LoggingHook` (reuse) ·
  реализации портов Этапа 12 `MemoryContextSource`/`KnowledgeContextSource`.
- **dataclass / DTO:** `Metadata` · `Document` · `Chunk` · `RetrievalQuery` · `ScoredChunk` ·
  `RetrievalResult` · `SearchFilter` · `MemoryEntry` · `StyleFeatures` · `MemoryScope` (enum уровней §R9.1).
- **ABC:** нет — все интерфейсы через `Protocol` (req 14).
- **Сервисные интерфейсы:** `app/services/rag.py` — `build_memory_source(...)`,
  `build_knowledge_source(...)`, `ingest_document(...)`; интеграция в `build_ai_engine` (Этап 12).
- **Точки расширения:** hybrid-search (vector+keyword/RRF, §R9.11) · reranker (§R9.7) · cache-seam ·
  реальные pgvector/бэкенд-store'ы · versioning/retention-политики (§R9.9/R9.10) · metrics/logging hooks.

## Архитектурная проверка (план)

- **Соответствие MASTER_SPEC:** реализуются §R9.1–R9.13 как storage-agnostic фундамент (semantic-путь
  offline; keyword/hybrid/reranking/versioning/retention — seam'ы/расширения), §R5.2 (few-shot в порты),
  §R4.5/R4.6 (размерность), §R2.10 (embedding через провайдер). KB и Memory — независимые подсистемы (§R9.3).
- **Соответствие §R5, §R3.1, §R3.8:** §R5 — AI-движок потребляет `Memory/Knowledge`-порты (few-shot §R5.2)
  **без изменения**; §R3.1 — Memory/RAG в домене, без БД-сессии/HTTP/бизнес-правил, composition в services,
  guard зелёный; §R3.8 — stores/strategies/rankers/chunkers расширяемы инъекцией/регистрацией без правки ядра.
- **Влияние на AI Engine:** **нулевое** — порты `MemoryContextSource`/`KnowledgeContextSource` уже
  объявлены на Этапе 12; Этап 13 поставляет их реализации; связывание — только в composition (services).
- **Влияние на Provider Layer:** **нулевое** — Этап 13 лишь новый потребитель `EmbeddingProvider`
  (Этап 11) через фабрику (§R2.10); изменений провайдер-слоя нет.
- **Изменение Architecture Freeze:** **не требуется** — новые модули в существующих доменных пакетах
  `app/memory`/`app/rag`; тот же паттерн «протоколы + фейки → реальные адаптеры позже». Новых ADR нет.
- **Потенциальные архитектурные риски:** (1) keyword/hybrid — seam (не реализация) → чёткие Protocol'ы +
  пометки; (2) channel-изоляция обязана быть сквозной → hard-filter + тесты; (3) storage-agnosticism →
  Store-протоколы/DTO, реальные store'ы — RV-12. Иных системных рисков не предвидится.

---

> **Стоп для утверждения.** К реализации Этапа 13 приступаю только после подтверждения плана. Без
> утверждения Этап 13 не начинаю.
