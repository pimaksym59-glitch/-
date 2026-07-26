# RELEASE NOTES — Stage 15 (Image Engine)

**Project:** AI Telegram Automation Platform · **Version:** 0.1.0 · **Date:** 2026-07-26
**Architecture Freeze:** ACTIVE · **SoT:** `MASTER_SPEC.md` v2.0

---

## Что сделано

**Provider-agnostic Image Engine** в `app/images` (§R6) — оркестратор поверх `ImageProvider` Protocol
Этапа 11. **Никаких вендорских вызовов; никаких content-правил** (identity — по референсам). Независим
от AI Engine и Validation Engine.

- **Pipeline (раздельные стадии):** `ImagePromptBuilder` (**базовый** промпт + negative) → `StylePipeline`
  (**отдельный слой**) → `PromptEnhancementPipeline` (**модульно**, каждый энхансер — Protocol).
- **Selection:** `ImageProviderSelector` (только провайдер, §R6.9) и `ImageModelRouter` (только модель,
  декларативно) — **независимы**.
- **Aspect / Size:** `AspectRatio` — **модель** (не строковые литералы) + константы; `SizePolicy` —
  **отдельная стратегия**.
- **Safety Layer** (§R6.2): **только решение** (вымышленные актёры, запрет реальных лиц/контента) —
  **не генерирует**.
- **Image Validation** (§R6.7): публичный `ImageValidator` порт (реальный face/CLIP — RV-14) → управляет
  **regen** (`IMAGE_MAX_REGEN`, §R6.5, ≠ infra retry).
- **Post-processing** (§R6.8): независимый Pipeline (`ThumbnailStage`/`PhashStage`) — thumbnail + phash
  offline через Pillow; сборка `ImageMetadata` (immutable).
- **Batch / streaming/progressive** — только точки расширения; **cost/metrics/logging** — hooks.
- **Composition** — `app/services/images.py`: `build_image_engine` / `generate_image`.

Toolchain зелёный: ruff, mypy-strict (263 файла, **0 `type: ignore`**), **pytest 309 passed /
6 skipped** (без warnings); подсистема покрыта на **100%**.

## ⚠️ Ограничение верификации (нет реальных image-API)

Реальная генерация (Nano Banana/Flux/OpenAI/Ideogram), identity-conditioning (§R6.1), CLIP/face-embedding-
валидация (§R6.4/R6.7), batch/streaming — **вне объёма Этапа 15**, отмечены **Runtime Verification
Pending (RV-14)**. Новых зависимостей нет (Pillow уже установлен).

## Архитектурные инварианты (подтверждено)
- Image Engine независим от AI Engine и Validation Engine (grep: images не импортирует content/validators/
  memory/rag; они не импортируют images).
- Взаимодействие с генераторами — только через `ImageProvider` Protocol Этапа 11.
- Новых циклов нет; layering guard зелёный.

## Новые публичные API (для следующих этапов)
`build_image_engine` / `generate_image` (services); `ImageEngine.generate`; DTO `ImageSpec`/`ImageRequest`/
`GeneratedImage`/`ImageMetadata`/`AspectRatio`; порты `ImageValidator`/`ImageProvider`/`ImageCostSink`.

## Следующий этап
**Этап 16 — Telegram Engine** (§R13.1 шаг 16, §R7): публикация через Bot API/aiogram (Provider Protocols
Этапа 11), режимы текст/фото/альбом, пер-бот лимиты. Начинается **только по отдельной команде**.
