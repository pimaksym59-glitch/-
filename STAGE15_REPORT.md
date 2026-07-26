# STAGE15_REPORT.md — Этап 15: Image Engine

**Этап:** §R13.1 шаг 15. **Дата:** 2026-07-26. **Статус:** завершён (полностью offline), ждёт
подтверждения. **План:** утверждён (`TASK_BREAKDOWN_STAGE15.md` + 22 доп. требования владельца).

---

## ⚠️ Ограничение верификации (нет реальных image-API)

По требованию — не имитировать runtime. **Три статуса:**
- **Implemented / Statically Verified (offline):** движок целиком offline на `FakeImageProvider`
  (Этап 11) + фейк-валидаторе — pipeline, prompt-builder, style, enhancement, aspect/size, selection,
  safety, post-processing (thumbnail/**phash** через Pillow), regen, batch/streaming/cost/metrics/
  logging seam'ы. Покрытие подсистемы **100%**.
- **Runtime Verification Pending (RV-14):** реальная генерация (Nano Banana/Flux/OpenAI/Ideogram),
  identity-conditioning по референсам (§R6.1), CLIP/face-embedding-валидация (§R6.4/R6.7), batch/streaming.

## 1. Реализовано (`app/images/`, provider-agnostic оркестрация)

| Модуль | Роль |
|---|---|
| `types.py` | immutable DTO: `SceneDescriptor`/`ImageSpec`/`ImageRequest`/`ImageMetadata`/`GeneratedImage`/`Usage` |
| `aspect.py` | `AspectRatio` — **модель** (не строки) + именованные константы (req 8) |
| `size.py` | `SizePolicy` Protocol + `BoundedSizePolicy` — **отдельная стратегия** (req 9), независима от aspect |
| `prompt.py` | `ImagePromptBuilder` — **базовый** промпт + negative (req 3) |
| `style.py` | `StylePipeline` — **отдельный слой** (req 7) |
| `enhancement.py` | `PromptEnhancer` Protocol + `PromptEnhancementPipeline` — **модульно** (req 4) |
| `selection.py` | `ImageProviderSelector` (провайдер) + `ImageModelRouter` (модель) — **независимы** (req 5/6) |
| `safety.py` | `SafetyLayer` — **только решение**, не генерирует (req 10, §R6.2) |
| `validation.py` | `ImageValidator` Protocol (§R6.7) — публичный порт (req 11) |
| `postprocess.py` | `PostProcessingPipeline` (`ThumbnailStage`/`PhashStage`) — независимый (req 12, §R6.8) |
| `regen.py` | `should_regenerate`/`decide` — решение (§R6.5, `IMAGE_MAX_REGEN` ≠ retry) |
| `batch.py`/`streaming.py` | `BatchGenerator`/`ImageStreamSink` — seam'ы (req 13/14) |
| `cost.py` | `ImageCostSink` — hook (req 15) |
| `engine.py` | **`ImageEngine`** — оркестратор: select→build→style→enhance→safety→size→generate→post→validate→regen |
| `fakes.py` | +`FakeImageValidator` (детерминированный) |
| `services/images.py` | composition `build_image_engine`/`generate_image` |

## 2. Соответствие 22 доп. требованиям владельца
1 Engine — оркестратор без правил ✅ · 2 только `ImageProvider` Protocol ✅ · 3 Prompt Builder — только
базовый ✅ · 4 Enhancement модульный (каждый энхансер — Protocol) ✅ · 5 Provider Selection — только
провайдер ✅ · 6 Model Selection независим/декларативен ✅ · 7 Style Pipeline — отдельный слой ✅ · 8 Aspect
Ratio — модель, без строк ✅ · 9 Size Policy — отдельная стратегия ✅ · 10 Safety — только решение ✅ ·
11 Image Validation — публичный Protocol ✅ · 12 Post-processing — независимый Pipeline (компоненты) ✅ ·
13 batch/streaming — только seam'ы ✅ · 14 Metadata immutable ✅ · 15 cost — hooks ✅ · 16 metrics/logging —
hooks ✅ · 17 runtime не имитируется (RV-14) ✅ · 18 фейки детерминированы ✅ · 19 публичные интерфейсы —
Protocol ✅ · 20 контракты/матрица — §5/6 ✅ · 21 архитектурная проверка — §7 ✅ · 22 новые публичные API — §8 ✅.

## 3. Верификация (offline)
| Проверка | Результат |
|---|---|
| `ruff` / `format` | All checks passed |
| `mypy --strict` | Success: 263 files, **0 `type: ignore`** |
| `pytest` | **309 passed, 6 skipped** (без warnings) |
| новых offline-тестов Этапа 15 | **18** (components/engine/composition) |
| coverage подсистемы | **100%** (`app/images` + `services/images`) |

## 4. Технический долг
Нет TODO/FIXME/`type: ignore`/`print`/`random`. phash через `Image.tobytes()` (без deprecated
`getdata`). Aspect — модель (не строковые литералы). Reuse `providers.observability` — без дублирования.
Секретов в коде нет.

## 5. Публичные контракты Этапа 15 (Stable/Internal)
- **Protocol:** потребляемый `ImageProvider` (Этап 11, **Stable**) · `ImageValidator` (**Stable**) ·
  `PromptEnhancer` (**Stable**) · `SizePolicy` (**Stable**) · `ImageCostSink` (**Stable**) ·
  `ImageStreamSink` (**Stable**, extension) · `BatchGenerator` (**Stable**, extension).
- **dataclass/DTO (immutable):** `SceneDescriptor` · `ImageSpec` · `ImageRequest` · `ImageMetadata` ·
  `GeneratedImage` · `Usage` · `AspectRatio` · `SizeLimits` · `ImageValidationResult` · `SafetyVerdict` ·
  `PostProcessResult` · `RegenDecision` (enum) — **Stable**.
- **Pipeline/классы:** `ImagePromptBuilder` · `PromptEnhancementPipeline` · `StylePipeline` ·
  `PostProcessingPipeline` (`ThumbnailStage`/`PhashStage`) · `BoundedSizePolicy` · `SafetyLayer` ·
  `ImageProviderSelector` · `ImageModelRouter` · `ImageEngine` — **Stable**.
- **Fakes:** `FakeImageProvider` (Этап 11) · `FakeImageValidator` · `RecordingImageCostSink` — **Internal**.
- **Сервисные интерфейсы (`app/services/images.py`):** `build_image_engine`, `generate_image` — **Stable**.
- **Точки расширения:** реальные провайдеры · реальный `ImageValidator` (CLIP/face) · identity-conditioning ·
  CLIP-similarity · batch-generation · streaming/progressive · cost/metrics/logging-импл.

## 6. Матрица зависимостей
- **Новые входящие (кто импортирует `app/images` [новое]):** `app/services/images.py`, `tests/images/*`.
- **Новые исходящие (что импортирует `app/images` [новое]):** `app/core/providers` (factory/observability),
  `app/images/base` (ImageProvider Этапа 11), `Pillow`, stdlib. **НЕ импортирует** `app/content`,
  `app/validators`, `app/memory`, `app/rag`, `app/api`/`app/services`/`app/db`/`sqlalchemy` (проверено grep).
- **`app/services/images.py` исходящие:** `app/images`, `app/services/providers`, `app/core.config`.
- **Циклы:** отсутствуют — `images` ⊄ content/validators/memory/rag; те ⊄ `images` (grep NONE).
- **Layering guard:** `images` = домен; запрещённые (`app.api`/`app.services`/`app.repositories`/
  `app.db`/`fastapi`) не импортируются → guard зелёный (`test_layering` passed).

## 7. Архитектурная проверка
- **Соответствие MASTER_SPEC:** §R6.1–R6.9 (генерация-оркестрация; identity/CLIP — capability/порт/RV);
  §R2.10 (только Provider Protocols); §R3.1/§R3.8. Diversity/identity/CLIP — данные/порты, не хардкод.
- **Соответствие §R6, §R3.1, §R3.8:** §R6 — стадии/selection/safety/post/regen реализованы; §R3.1 — домен
  без БД/HTTP/бизнес-правил, composition в services, guard зелёный; §R3.8 — стадии/энхансеры/валидаторы/
  селекторы/size-policy расширяемы без правки ядра.
- **Влияние на AI Engine:** **нулевое** — параллельная подсистема; `app/content` не затрагивается.
- **Влияние на Validation Engine:** **нулевое** — image-validation через собственный порт `ImageValidator`;
  `app/validators` не используется/не изменяется.
- **Влияние на Provider Layer:** **нулевое** — новый потребитель `ImageProvider` (Этап 11) через фабрику.
- **Новые архитектурные риски:** (1) identity/CLIP/реальная генерация — RV-14; (2) batch/streaming — seam'ы;
  (3) provider/model связывание — раздельные механизмы. Иных системных рисков нет.
- **Изменение Architecture Freeze:** **не требуется** — новые модули в существующем `app/images`; паттерн
  «протоколы + фейки → реальные адаптеры позже». Новых ADR нет.

## 8. Новые публичные API (для следующих этапов)
Стабильные контракты, доступные Этапу 16+ (Telegram) и далее:
- **`app.services.images.build_image_engine(settings, ...) -> ImageEngine`** и
  **`generate_image(settings, request) -> GeneratedImage`** — точка входа генерации изображений.
- **`ImageEngine.generate(ImageRequest) -> GeneratedImage`** — оркестрация (для queue-хендлера
  `generate_image` Этапа 8/16).
- **DTO:** `ImageSpec`/`SceneDescriptor`/`ImageRequest`/`ImageMetadata`/`GeneratedImage`/`AspectRatio`
  (+константы `SQUARE`/`LANDSCAPE`/`PORTRAIT`/`STANDARD`) — контракт входа/выхода генерации.
- **Порты:** `ImageValidator` (подключить реальный CLIP/face — RV-14) · `ImageProvider` (реальные адаптеры) ·
  `ImageCostSink`/`ImageStreamSink`/`BatchGenerator` (расширения).

## 9. Итог
Image Engine реализован полностью и **offline**: provider-agnostic оркестратор поверх `ImageProvider`
Этапа 11; раздельные prompt-builder/style/enhancement, независимые provider/model selection, aspect-модель
+ size-стратегия, safety (только решение), image-validation через порт, post-processing (thumbnail/phash),
regen ≠ retry; batch/streaming/cost — seam'ы/hooks. Долга нет, покрытие 100%. **Реальная генерация/CLIP/
identity — RV-14.** Этап 16 (Telegram Engine) — по отдельной команде.
