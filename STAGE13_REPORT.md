# STAGE13_REPORT.md — Этап 13: Memory + Knowledge + RAG Foundation

**Этап:** §R13.1 шаг 13. **Дата:** 2026-07-25. **Статус:** завершён (полностью offline), ждёт
подтверждения. **План:** утверждён (`TASK_BREAKDOWN_STAGE13.md` + 17 доп. требований владельца).

---

## ⚠️ Ограничение верификации (нет реальных embedding-API и бэкендов)

По требованию — не имитировать runtime. **Три статуса:**
- **Implemented / Statically Verified (offline):** весь Этап 13 offline на `FakeEmbeddingProvider`
  (Этап 11) + in-memory детерминированных фейк-хранилищах — DTO, similarity, embedding-адаптер,
  chunking, filters (channel-изоляция), stores, retrieval/ranking/assembly, ingestion, Memory/
  Knowledge источники, composition. Покрытие подсистемы **~99%**.
- **Runtime Verification Pending (RV-12):** реальные **pgvector**-store'ы, живые embedding-вызовы,
  фактический semantic/keyword/hybrid-поиск + reranking под живыми PostgreSQL+embedding-API.

## 1. Реализовано

**`app/rag/` — storage-agnostic retrieval-kernel + Knowledge Base:**

| Модуль | Роль |
|---|---|
| `types.py` | immutable DTO: `Metadata`/`Document`/`Chunk`/`SearchFilter`/`RetrievalQuery`/`SearchResult`/`RetrievalContext` |
| `similarity.py` | `Similarity` Protocol + `CosineSimilarity` (чистая математика, свап-friendly) |
| `embedding.py` | `Embedder` Protocol + `ProviderEmbedder` (**только** через `EmbeddingProvider` Этапа 11) |
| `chunking.py` | `Chunker` Protocol + `SemanticBlockChunker` (**независим**, по смыслу; знает только текст) |
| `stores.py` | `VectorStore`/`DocumentStore`/`ChunkStore` **Protocol** (без pgvector/FAISS/Qdrant) |
| `filters.py` | `matches` — channel hard-filter (§R9.2) + doc-type + active-version (§R9.7) |
| `retrieval.py` | `RetrievalStrategy`/`SemanticStrategy`/`RetrievalPipeline` — **только кандидаты**; hybrid — seam |
| `ranking.py` | `Ranker`/`ScoreRanker` — **только сортировка** найденного (без ре-retrieval) |
| `assembly.py` | `ContextAssembler` — **только** на ranked-результатах (без Store); ≤ бюджета, few-shot K |
| `cache.py` | `CacheSeam`/`NoOpCache` — seam |
| `observability.py` | `RagObservability` (metrics/logging hooks, §R9.13) |
| `fakes.py` | `FakeVectorStore`/`FakeDocumentStore` — детерминированы |
| `knowledge.py` | `ingest_document` (§R9.4) + `KnowledgeRetriever` (порт `KnowledgeContextSource`) |

**`app/memory/` — независимая Memory-подсистема:** `types.py` (`MemoryScope`/`MemoryEntry`/
`StyleFeatures` §R9.1/R9.12), `stores.py` (`MemoryStore` Protocol + `FakeMemoryStore`), `source.py`
(`MemoryRetriever` — порт `MemoryContextSource`). **Не импортирует Knowledge** (проверено).

**`app/services/rag.py`** — composition: `build_memory_source`/`build_knowledge_source`/`ingest`/
`build_ai_engine_with_rag` (AI-движок Этапа 12 **не изменён**).

## 2. Соответствие 17 доп. требованиям владельца
1 kernel независим от бэкендов ✅ · 2 Store — Protocol, без ABC ✅ · 3 embedding только через
`EmbeddingProvider` ✅ · 4 chunking независим ✅ · 5 retrieval — только кандидаты ✅ · 6 ranking отдельно
(без ре-retrieval) ✅ · 7 assembly только на результатах (без Store) ✅ · 8 Memory ⊥ Knowledge, связь
через порты ✅ · 9 Knowledge не импортирует Memory ✅ · 10 Similarity — отдельный свап-интерфейс ✅ ·
11 Metadata immutable ✅ · 12 DTO frozen ✅ · 13 hybrid — только seam ✅ · 14 cache — seam ✅ · 15 metrics/
logging — hooks ✅ · 16 runtime не имитируется (RV-12) ✅ · 17 публичные контракты — ниже ✅.

## 3. Верификация (offline)
| Проверка | Результат |
|---|---|
| `ruff` / `format` | All checks passed |
| `mypy --strict` | Success: 225 files, **0 `type: ignore`** |
| `pytest` | **269 passed, 6 skipped** (skipped = ранее-gated integration) |
| новых offline-тестов Этапа 13 | **25** (kernel/pipeline/knowledge/memory/composition) |
| coverage подсистемы | **~99%** (rag/memory/composition; большинство модулей 100%) |
| независимость | memory ⊄ knowledge и knowledge ⊄ memory (импорт-проверка) |

## 4. Технический долг
Нет TODO/FIXME/`type: ignore`/`print`/`random`. Reuse `workers` (metrics/logging) — без дублирования.
`MemoryScope.global_` (не `global`) — во избежание keyword-конфликта. Секретов в коде нет.

## 5. Границы (не делано)
Реальные pgvector/бэкенд-store'ы, embedding-вызовы, keyword/hybrid(RRF)-поиск, reranking, cache,
versioning/retention-жизненный-цикл — RV-12/расширения. §R9.9 retention — метадата-тир (без движка
очистки). Реальный токенайзер-aware chunking — позже.

## 6. Публичные контракты Этапа 13 (req 17)

**Protocol** — все Stable Public Contract (точки расширения):
- `Similarity`, `Embedder`, `Chunker`, `VectorStore`, `DocumentStore`, `ChunkStore`,
  `RetrievalStrategy`, `Ranker`, `CacheSeam` (`app/rag`) — **Stable Public Contract**.
- `MemoryStore` (`app/memory`) — **Stable Public Contract**.
- реализуемые порты Этапа 12 `MemoryContextSource`/`KnowledgeContextSource` — **Stable** (объявлены на 12).

**dataclass / DTO** (frozen):
- `Metadata`, `Document`, `Chunk`, `SearchFilter`, `RetrievalQuery`, `SearchResult` — **Stable Public Contract**.
- `RetrievalContext` — **Internal Contract** (observability-снимок; форма может меняться).
- `MemoryEntry`, `StyleFeatures`, `MemoryScope` (enum) — **Stable Public Contract**.

**Классы (реализации):**
- `CosineSimilarity`, `ProviderEmbedder`, `SemanticBlockChunker`, `SemanticStrategy`,
  `RetrievalPipeline`, `ScoreRanker`, `ContextAssembler`, `NoOpCache`, `RagObservability`,
  `KnowledgeRetriever`, `MemoryRetriever` — **Stable Public Contract**.
- `FakeVectorStore`, `FakeDocumentStore`, `FakeMemoryStore` — **Internal Contract** (тест/offline-двойники).

**Сервисные интерфейсы (`app/services/rag.py`)** — **Stable Public Contract:**
- `build_memory_source(settings, ...)`, `build_knowledge_source(settings, ...)`,
  `build_ai_engine_with_rag(settings, ...)`, `ingest(document, ...)`, `ingest_document(...)`.

**Точки расширения:** hybrid/keyword-search (RRF) · reranker · cache-backend · реальные pgvector-store'ы ·
versioning/retention-политики · metrics/logging-имплементации.

## 7. Итог
Memory/Knowledge/RAG-фундамент реализован полностью и **offline**: storage-agnostic kernel (retrieval/
ranking/assembly раздельны), embedding только через Provider Protocol, независимый chunking, channel-
изоляция, две **независимые** подсистемы, интеграция с AI-движком **без его изменения**. Долга нет.
**RAG-runtime — RV-12.** Этап 14 (Validation) — по отдельной команде.

---

## Архитектурная проверка

- **Соответствие MASTER_SPEC:** реализованы §R9.1–R9.13 как storage-agnostic фундамент (semantic-путь
  offline; keyword/hybrid/reranking/versioning/retention — seam'ы/расширения); §R5.2 (few-shot в порты);
  §R4.5/R4.6 (размерность); §R2.10 (embedding через провайдер). KB ≠ Memory — независимы (§R9.3).
- **Соответствие §R9, §R5, §R3.1 и §R3.8:** §R9 — уровни/изоляция/ingestion/chunking/retrieval/ranking/
  assembly/observability. §R5 — AI-движок потребляет порты (§R5.2) без изменений. §R3.1 — Memory/RAG в
  домене, без БД-сессии/HTTP/бизнес-правил; composition в services; guard зелёный. §R3.8 — stores/
  strategies/rankers/chunkers/similarity расширяемы инъекцией без правки ядра.
- **Влияние на AI Engine:** **нулевое** — движок Этапа 12 не изменён; порты уже объявлены, Этап 13
  поставил их реализации; связывание — только в composition.
- **Влияние на Provider Layer:** **нулевое** — Этап 13 лишь новый потребитель `EmbeddingProvider`
  (Этап 11) через фабрику; изменений провайдер-слоя нет.
- **Новые архитектурные риски:** (1) keyword/hybrid — seam (не реализация) → чёткие Protocol'ы + пометки;
  (2) channel-изоляция обязана быть сквозной → hard-filter + тесты; (3) storage-agnosticism → Store-
  протоколы/DTO, реальные store'ы — RV-12. Иных системных рисков нет.
- **Изменение Architecture Freeze:** **не требуется** — новые модули в существующих доменных пакетах
  `app/memory`/`app/rag`; паттерн «протоколы + фейки → реальные адаптеры позже». Новых ADR нет.
