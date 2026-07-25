# RELEASE NOTES — Stage 14 (Validation Engine)

**Project:** AI Telegram Automation Platform · **Version:** 0.1.0 · **Date:** 2026-07-26
**Architecture Freeze:** ACTIVE · **SoT:** `MASTER_SPEC.md` v2.0

---

## Что сделано

**Полностью независимая подсистема Validation Engine** в `app/validators` (§R5.5–R5.9) — импортирует
**только stdlib** (ни одного `app.*`). AI-движок видит её **только** через `OutputValidator` Protocol
(Этап 12); адаптер — в composition. **Движок Этапа 12 не изменён.**

- **Rule Engine:** каждое правило — модуль за единым `Rule` Protocol (dedup / humanization / persona /
  policy); типизированный, потокобезопасный, детерминированный `RuleRegistry`; модульный
  `ValidationPipeline`.
- **Модели (immutable):** `Severity` (первоклассная модель, не строки), `Finding`, `ValidationReport`,
  `RuleContext` — все frozen.
- **Deduplication** (§R5.7): каскад дёшево→дорого — trigram Jaccard → sentence overlap (чистый текст) →
  vector-стадия через порт `DuplicationChecker` (Memory/RAG публичные интерфейсы, RV-13). Не трогает Store.
- **Humanization** (§R5.8/§R1.6): стоп-лист AI-клише (**без LLM**) + humanness-порог через порт
  `HumannessScorer` (LLM-judge — RV-13).
- **Persona / Policy** — независимые модули (forbidden_expressions; banned_words/max_length).
- **Quality Gates** (§R5.9): **декларативны** — `QualityGatePolicy` (blocking-severity + soft-rules);
  движок не хардкодит проверки.
- **Auto-Rewrite-Decision** (§R5.6): `decide` → accept/rewrite/needs_review — **только решение**; rewrite
  крутит AI-движок.
- **Metrics/Logging** — локальные hooks (no-op). **ML-validators** — точка расширения (`Rule`), без реализации.
- **Composition** — `app/services/validation.py`: `build_validation_engine`/`build_output_validator`/
  `build_ai_engine_with_validation`.

Toolchain зелёный: ruff, mypy-strict (244 файла, **0 `type: ignore`**), **pytest 291 passed /
6 skipped**; подсистема покрыта на **~99%**.

## ⚠️ Ограничение верификации (нет реальных LLM/embedding)

Реальный **LLM-judge** (humanness) и **vector-стадия dedup** (через Memory/RAG+embeddings), ML-валидаторы —
**вне объёма Этапа 14**, отмечены **Runtime Verification Pending (RV-13)**. Новых зависимостей нет.

## Архитектурные инварианты (подтверждено)
- AI Engine не зависит от реализации Validation; Validation не зависит от AI Engine (stdlib-only).
- Memory/RAG — только через публичные Protocol (порт `DuplicationChecker`).
- Новых циклов нет; layering guard зелёный.

## Следующий этап
**Этап 15 — Image Engine** (§R13.1 шаг 15, §R6): генерация изображений через Provider Protocols Этапа 11,
identity-conditioning по референсам, проверки дублей (phash/CLIP). Начинается **только по отдельной команде**.
