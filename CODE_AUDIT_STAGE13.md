# CODE_AUDIT_STAGE13.md — Аудит качества кода Этапа 13 (Memory + Knowledge + RAG)

**Область:** `app/rag/*`, `app/memory/*`, `app/services/rag.py`, `tests/rag/*`, `tests/memory/*`,
`tests/services/test_rag.py`. **Дата:** 2026-07-25. **Метод:** self-review + ruff/mypy/pytest/coverage.
**Ограничение:** реальные embedding/бэкенды не вызывались.

---

## 1. Слои / архитектура (§R3.1)
- Memory/RAG в домене: **без БД-сессии, без HTTP, без бизнес-правил**. `test_layering` зелёный.
- **Storage-agnostic:** kernel зависит только от Store-**Protocol**'ов (не pgvector/FAISS/Qdrant).
- **Независимость подсистем:** `app/memory` не импортирует `app/rag/knowledge`; `app/rag/knowledge`
  не импортирует `app/memory` (проверено grep). Связь Memory↔Knowledge — только через порты Этапа 12.
- Зависимости «наружу»: `app/rag`,`app/memory` → `app/llm` (EmbeddingProvider), `app/content` (порты/
  бюджет), `app/core`, `app/workers` (observability). Циклов нет.

## 2. Соответствие особым требованиям (1–17)
| # | Требование | Статус |
|---|---|---|
| 1 | kernel независим от бэкендов | ✅ (только Store-протоколы) |
| 2 | Store — Protocol, без ABC | ✅ (все интерфейсы `Protocol`) |
| 3 | embedding только через `EmbeddingProvider` | ✅ (`ProviderEmbedder`) |
| 4 | chunking независим | ✅ (не импортирует retrieval/ranking) |
| 5 | retrieval — только кандидаты | ✅ (`RetrievalPipeline.retrieve`) |
| 6 | ranking отдельно, без ре-retrieval | ✅ (`ScoreRanker.rank` — чистый) |
| 7 | assembly только на результатах, без Store | ✅ (`ContextAssembler`) |
| 8/9 | Memory ⊥ Knowledge (взаимно) | ✅ (импорт-проверка) |
| 10 | Similarity — свап-интерфейс | ✅ (`Similarity` Protocol) |
| 11/12 | Metadata/DTO immutable (frozen) | ✅ (тесты FrozenInstanceError) |
| 13/14/15 | hybrid/cache/metrics/logging — seam/hooks | ✅ |
| 16 | runtime не имитируется | ✅ (RV-12) |
| 17 | публичные контракты перечислены | ✅ (STAGE13_REPORT §6) |

## 3. Типизация / стиль
- `mypy --strict` — **0 ошибок (225 файлов), 0 `type: ignore`**. `ruff` — All checks passed.
- Все интерфейсы — `Protocol` (req 2/14); DTO — `@dataclass(frozen=True, slots=True)`; PEP 695 дженерики
  не требовались. Frozen-тесты — через `setattr` с переменным именем (обходит B010 без `type: ignore`).

## 4. Корректность (ключевые точки)
- **Channel isolation (§R9.2):** `matches` отсекает чужой канал; global — по `include_global`; тесты
  «чужой канал отсечён» на vector-store, memory-store и knowledge-retriever.
- **Разделение (§R9.7/R9.8):** retrieval→кандидаты; ranking→сортировка (стабильная, tie-break по id);
  assembly→упаковка под бюджет+K. Каждый шаг тестируется изолированно.
- **Chunking (§R9.5):** абзацы→(предложения при переполнении)→слияние под target; детерминированные id
  (`uuid5`); пустой ввод → []. Не по символам.
- **Ingestion (§R9.4):** chunk→embed(batch)→upsert→put; прямой async-вызов, не задача.
- **Embedding (§R2.10):** только `EmbeddingProvider`; фейк детерминирован (unit-вектор по sha256).
- **Immutability:** frozen DTO; `dataclasses.replace` для присвоения embedding при ingestion.

## 5. Тесты / покрытие
- **25 offline-тестов** (kernel: similarity/embedding/chunking/filters/stores; pipeline: retrieval/
  ranking/assembly/knowledge/ingestion; memory: store/source/types; services: composition + интеграция
  с AI-движком). Все детерминированы.
- coverage подсистемы **~99%**: rag (assembly/cache/chunking/embedding/fakes/filters/knowledge/
  observability/ranking/retrieval/similarity/stores/__init__) и memory (source/types/__init__) 100%;
  memory/stores 97% (ветвь entry без embedding), types 98%. Логических offline-пробелов нет.

## 6. Наблюдения / риски
| # | Наблюдение | Severity | Примечание |
|---|---|---|---|
| A | Реальные бэкенды/embeddings не вызывались | 🟢 | по замыслу; RV-12 |
| B | Keyword/hybrid/reranking — seam | 🟡 | Protocol'ы + RRF-seam; реализация — при бэкендах |
| C | Chunking — блочная эвристика (не токенайзер-aware) | 🟡 | `TokenEstimator` seam; реальный токенайзер позже |
| D | Retention/versioning — метадата/фильтр | 🟢 | жизненный цикл — RV-12/расширение |
| E | rag→content (ContextItem/бюджет) | 🟢 | мост к порту AI-движка; content не импортирует rag (без цикла) |

## 7. Технический долг
Нет. `print`/`type: ignore`/`TODO`/`random`/`time.time` в коде отсутствуют; удалён неиспользуемый
`sequence_to_vector`. Дублирования нет (reuse workers observability, content budget/ContextItem).
Секретов в коде нет.

## 8. Трассируемость
§R9.1–R9.13, §R2.10, §R5.2, §R4.5/R4.6, §R3.1/R3.8 — Implemented + Statically Verified (offline);
RAG-runtime — Pending (RV-12). См. `TRACEABILITY_STAGE2.md` (Этап 13, требования 106–120).

## 9. Вердикт
**Этап 13 — чисто (offline).** Storage-agnostic retrieval-kernel + две **независимые** подсистемы
Memory/Knowledge; embedding только через Provider Protocol; retrieval/ranking/assembly раздельны;
channel-изоляция сквозная; DTO immutable; все интерфейсы — Protocol; AI-движок не изменён. Строго
типизирован (0 `type: ignore`). Долга нет. **RAG-runtime — RV-12.** Готов к Этапу 14 после подтверждения.
