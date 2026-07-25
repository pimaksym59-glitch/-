# RELEASE NOTES — Stage 13 (Memory + Knowledge + RAG Foundation)

**Project:** AI Telegram Automation Platform · **Version:** 0.1.0 · **Date:** 2026-07-25
**Architecture Freeze:** ACTIVE · **SoT:** `MASTER_SPEC.md` v2.0

---

## Что сделано

**Storage-agnostic RAG-фундамент + две независимые подсистемы** Memory и Knowledge (§R9). Реализуют
context-порты `MemoryContextSource`/`KnowledgeContextSource`, объявленные AI-движком на Этапе 12 —
**движок не изменён**.

- **`app/rag` — нейтральный retrieval-kernel:** immutable DTO (`Metadata`/`Document`/`Chunk`/
  `SearchFilter`/`SearchResult`/`RetrievalContext`); `Similarity` (свап-интерфейс) + `CosineSimilarity`;
  embedding **только** через Stage-11 `EmbeddingProvider` (`ProviderEmbedder`); **независимый** chunking
  (semantic-блоки, §R9.5); `VectorStore`/`DocumentStore`/`ChunkStore` **Protocol** (без pgvector/FAISS/
  Qdrant); channel hard-filter (§R9.2); retrieval (**только кандидаты**), ranking (**только сортировка**),
  assembly (**только на результатах**) — раздельны (§R9.7/R9.8); cache/observability seam'ы; фейки.
- **Knowledge Base:** ingestion (§R9.4: chunk→embed→index, прямой вызов), `KnowledgeRetriever`.
- **`app/memory` — независимая Memory-подсистема:** уровни (§R9.1), Style Memory (**признаки, не тексты**,
  §R9.12), `MemoryStore` + `MemoryRetriever`. **Не импортирует Knowledge** (и наоборот).
- **`app/services/rag.py`** — composition: `build_memory_source`/`build_knowledge_source`/`ingest`/
  `build_ai_engine_with_rag`.

Toolchain зелёный: ruff, mypy-strict (225 файлов, **0 `type: ignore`**), **pytest 269 passed /
6 skipped**; подсистема покрыта на **~99%**.

## ⚠️ Ограничение верификации (нет реальных embedding-API и бэкендов)

Реальные **pgvector**-store'ы, живые embedding-вызовы, semantic/keyword/hybrid-поиск + reranking —
**вне объёма Этапа 13**, отмечены **Runtime Verification Pending (RV-12)**. Новых зависимостей нет.

## Решения этапа
- **Разделение concerns:** retrieval ⟂ ranking ⟂ assembly; каждый — свап-компонент (§R3.8).
- **Независимость подсистем:** Memory и Knowledge не импортируют друг друга; общий — нейтральный kernel;
  связь — только через порты AI-движка.
- **Storage-agnostic:** Store-протоколы + immutable DTO; реальные бэкенды — RV-12.
- **Embedding — только через Provider Protocol** (§R2.10); фейк детерминирован.
- **Channel isolation (§R9.2)** — сквозной hard-filter; покрыт тестами.

## Открытые риски
| Риск | Уровень | Где решается |
|---|---|---|
| Реальные бэкенды/embeddings не проверены | 🟢 | при PG+embeddings (RV-12) |
| Keyword/hybrid/reranking — seam | 🟡 | Protocol'ы + RRF-seam; при бэкендах |
| Chunking — блочная эвристика | 🟡 | `TokenEstimator` seam; токенайзер позже |

## Следующий этап
**Этап 14 — Validation** (§R13.1 шаг 14, §R5.5–R5.9): доменные quality-гейты (грамматика/человечность/
уникальность/дедуп), подключаемые в validation-seam AI-движка Этапа 12. Начинается **только по
отдельной команде**.
