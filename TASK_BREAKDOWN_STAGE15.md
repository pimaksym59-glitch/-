# TASK_BREAKDOWN — Stage 15 (Image Engine)

**Требует утверждения перед реализацией.** Цель (§R13.1 шаг 15, §R6): **provider-agnostic Image
Engine** — модульный generation-pipeline, image-prompt-builder + модульный prompt-enhancement,
независимые provider/model selection, style-pipeline, aspect-ratio/size-policy, safety-layer,
image-validation через порт, post-processing-pipeline (thumbnail/phash/metadata), regen-decision и
точки интеграции (batch/streaming/cost/metrics/logging). **Использует только `ImageProvider` Protocol
Этапа 11; никаких вызовов Nano Banana/Flux/OpenAI/Ideogram. Engine не генерирует сам без провайдера.**
Architecture Freeze ACTIVE; SoT — MASTER_SPEC.

## Размещение (по §R3.1)

Доменный пакет **`app/images/`** (§R13.1 шаг 15; §R6; уже есть `base.py`/`fakes.py` Этапа 11). Домен
**не открывает БД/HTTP**; использует `app/core/providers` (factory/errors/observability) и
`app/images/base` (ImageProvider Этапа 11). **Полностью независим от конкретных провайдеров** (req 1).
Composition — `app/services/images.py`. Image Engine **не зависит** от AI Engine и Validation Engine
(параллельная доменная подсистема); image-validation — собственный порт `ImageValidator`.

---

## ⚠️ Ограничение среды (нет реальных image-API)

По требованию — не имитировать runtime. **Три статуса:**
- **Implemented / Statically Verified (offline):** движок целиком offline на **`FakeImageProvider`**
  (Этап 11, детерминированный Pillow-placeholder) + фейк-валидаторе — pipeline, prompt-builder,
  enhancement, style, aspect/size, safety, post-processing (thumbnail/**phash** через Pillow),
  regen-decision, batch/streaming/cost/metrics/logging seam'ы. Покрытие ~100%.
- **Runtime Verification Pending (RV-14):** реальная генерация против **живых** image-провайдеров
  (Nano Banana/Flux/OpenAI/Ideogram), **identity-conditioning по референсам** (§R6.1),
  **CLIP/face-embedding-валидация** (§R6.4/R6.7). Наследует RV-10. Интеграционные тесты — skip.

## Особые требования владельца (1–19)
1 Engine ⟂ конкретных провайдеров · 2 только `ImageProvider` Protocol (Этап 11) · 3 Prompt Builder ⟂
Enhancement · 4 Enhancement модульный · 5 provider selection ⟂ model selection · 6 Style Pipeline —
отдельный слой · 7 Aspect Ratio / Size Policy — независимые компоненты · 8 Safety Layer не генерирует ·
9 Image Validation — только через публичный Protocol · 10 Post-processing — Pipeline · 11 без реальной
генерации без провайдера · 12 без вызовов внешних image-API · 13 batch — точки расширения (без
реализации) · 14 streaming/progressive — точки расширения (без реализации) · 15 cost — только hooks ·
16 metrics/logging — только hooks · 17 фейк-провайдеры детерминированы · 18 публичные интерфейсы —
Protocol · 19 три статуса.

## Ключевые развязки
- **Regen (§R6.5, `IMAGE_MAX_REGEN=3`) ≠ infra retry (`MAX_RETRIES=5`).** Engine крутит quality/uniqueness-
  regen по результату image-validation порта; инфраструктурные ретраи — у Executor.
- **Identity (§R6.1):** референсы актёра (`reference_images_folder`) — **вход** в `ImageSpec`; identity-
  conditioning — **capability провайдера** (§R6.1, не текст/seed); реальное кондиционирование — RV-14.
- **Similarity cascade (§R6.4):** phash (offline, Pillow) ≠ scene-metadata (offline) ≠ CLIP (порт/RV-14).
- **Diversity before generation (§R6.3):** сцена (локация/одежда/поза/ракурс) — **данные** в `ImageSpec`
  (исключение окна `IMAGE_WINDOW` подаёт composition); Engine не хардкодит бизнес-логику выбора сцены.

---

## Последовательность задач

### T15.0 — Зависимости + gate
- **Новых зависимостей нет** (Pillow уже установлен — thumbnail/phash offline; провайдер — фейк Этапа 11).
- **Критерий:** нет новых пакетов; вендорских image-SDK нет (grep); при нужде — СТОП+отчёт.

### T15.1 — Image Engine Architecture (контракты)
- `app/images/types.py` — `SceneDescriptor` (location/clothing/pose/angle/emotion), `ImageSpec`
  (scene + actor-refs + style + descriptors — **данные**), `ImageRequest`, `ImageMetadata`,
  `GeneratedImage` (bytes + metadata), `Usage`, `Role`/kind. Immutable (frozen).
- `app/images/engine.py` — `ImageEngine.generate(request) -> GeneratedImage`: связывает pipeline,
  selection, safety, post-processing, validation, regen. **Только оркестрация.**
- **Критерий:** контракты типизированы/immutable; mypy strict.

### T15.2 — Image Prompt Builder (req 3)
- `app/images/prompt.py` — `ImagePromptBuilder`: структура промпта из `ImageSpec` (scene + actor +
  descriptors). **Отделён от enhancement**; без вендор-специфики.
- **Критерий:** структура из данных; независим от моделей; unit.

### T15.3 — Prompt Enhancement Pipeline (req 4) — модульно
- `app/images/enhancement.py` — `PromptEnhancer` Protocol + модульные энхансеры (quality-tags,
  negative-prompt assembly), упорядоченный `PromptEnhancementPipeline`. Расширяемо без правки ядра.
- **Критерий:** модульно; добавление энхансера без правки прочих; unit.

### T15.4 — Style Pipeline (req 6) — отдельный слой
- `app/images/style.py` — `StylePipeline`: применяет стиль-дескрипторы/пресеты (photorealistic/
  cinematic и т.п.) как **отдельный слой** (не смешан с enhancement/builder).
- **Критерий:** стиль — отдельный слой; unit.

### T15.5 — Aspect Ratio + Size Policy (req 7) — независимые компоненты
- `app/images/aspect.py` — `AspectRatio` (именованные соотношения → w:h); `app/images/size.py` —
  `SizePolicy` (ratio + лимиты → конкретный `(w,h)`). **Независимы** друг от друга и от провайдера.
- **Критерий:** aspect/size раздельны; unit (границы/лимиты).

### T15.6 — Provider + Model Selection (req 2/5) — независимы
- `app/images/selection.py` — `ImageProviderSelector` (через factory Этапа 11, §R2.10; identity-
  capability как критерий §R6.1) + `ImageModelRouter` (декларативно, независим от провайдера).
- **Критерий:** provider ⟂ model; фейк offline; unit.

### T15.7 — Safety Layer (req 8, §R6.2) — не генерирует
- `app/images/safety.py` — `SafetyLayer`: пред-генерационные проверки промпта/спеки (вымышленные
  актёры, запрет реальных лиц §R6.2, запрещённый контент). **Только проверка, без генерации.**
- **Критерий:** блокирует небезопасное; **не генерирует**; unit.

### T15.8 — Image Validation (req 9, §R6.7) — через публичный Protocol
- `app/images/validation.py` — `ImageValidator` Protocol (`async validate(image, metadata, *,
  actor_refs) -> ImageValidationResult`) + `ImageValidationResult` (passed, issues). Реальная
  (лицо/руки/глаза/artefacts/actor-match — CLIP/face-embedding) — RV-14; **фейк offline**.
- **Критерий:** порт типизирован; фейк детерминирован; управляет regen; unit.

### T15.9 — Post-processing Pipeline (req 10, §R6.8) — Pipeline
- `app/images/postprocess.py` — `PostProcessingPipeline`: thumbnail (Pillow), **phash** (offline
  average/dHash), сборка `ImageMetadata` (scene/prompt/negative/size/phash; CLIP — порт/RV). Каждый
  шаг — одна ответственность.
- **Критерий:** thumbnail/phash offline-детерминированы; metadata собрана; unit.

### T15.10 — Regen decision (§R6.5) — решение
- `app/images/regen.py` — `RegenDecision`/`should_regenerate(attempt, validation, *, max_regen)` —
  **решение**; regen-петлю крутит Engine (`IMAGE_MAX_REGEN` ≠ infra retry). Engine не выполняет regen
  вне своей петли.
- **Критерий:** останов по прохождению/исчерпанию; unit.

### T15.11 — Batch + Streaming/Progressive seams (req 13/14) — без реализации
- `app/images/batch.py` (`BatchGenerator` seam) и `app/images/streaming.py` (`ImageStreamSink` seam,
  progressive) — **только точки расширения**, no-op/passthrough.
- **Критерий:** seam'ы типизированы; без реализации; unit (точка вызвана).

### T15.12 — Cost / Metrics / Logging hooks (req 15/16)
- `app/images/cost.py` (`ImageCostSink`, §R6 стоимость — hook), `app/images/observability.py`
  (metrics/logging hooks — reuse `providers.observability` или локально). **Только hooks.**
- **Критерий:** no-op по умолчанию; unit.

### T15.13 — Composition + DI (`app/services/images.py`)
- `build_image_engine(settings, *, provider_factory=None, validator=None, ...)`; `generate_image(...)`
  convenience; фейк-провайдер/валидатор по умолчанию; factory Этапа 11. Опц. DI-seam в `app/api/deps.py`.
- **Критерий:** движок собран offline; переопределяемо; unit.

### T15.14 — Tests (offline)
- `tests/images/*` — types, prompt-builder, enhancement, style, aspect/size, selection (provider/model),
  safety, validation(fake), post-processing (thumbnail/phash), regen, batch/streaming seams, cost/hooks,
  engine end-to-end на `FakeImageProvider`. `tests/services/test_images.py` — composition.
- **Integration (за `RUN_INTEGRATION=1`+image-API, не запускается):** реальная генерация/identity/CLIP — **RV-14**.
- **Критерий:** offline зелёные ~100%; `mypy --strict` без `type: ignore`; guard зелёный; интеграционные skip.

### T15.15 — Reports + закрытие
- `STAGE15_REPORT.md` (+«Публичные контракты» Stable/Internal, +«Матрица зависимостей», +«Архитектурная
  проверка»), `CODE_AUDIT_STAGE15.md`, `RELEASE_NOTES_STAGE15.md`; обновить `TECHNICAL_BACKLOG.md`
  (RV-14 image-runtime; CLIP/identity/batch/streaming — расширения), `TRACEABILITY_STAGE2.md` (§R6.* —
  три статуса). README — секция Image Engine. Серия коммитов + тег `stage-15-image-engine`.
- **Критерий:** ruff/mypy-strict/pytest зелёные (offline); секреты не в git; тег на финале.

---

## Создаваемые/изменяемые файлы

| Файл | Действие |
|---|---|
| `app/images/{types,engine,prompt,enhancement,style,aspect,size,selection,safety,validation,postprocess,regen,batch,streaming,cost,observability}.py` | новые — Image Engine |
| `app/images/fakes.py` | edit — +`FakeImageValidator` (детерминированный) |
| `app/images/__init__.py` | обновить (экспорт) |
| `app/services/images.py` | новый — composition `build_image_engine` / `generate_image` |
| `app/api/deps.py` | edit — (опц.) `get_image_engine` DI-seam |
| `tests/images/*`, `tests/services/test_images.py` | новые — offline |
| `README.md` | edit — секция Image Engine |
| `STAGE15_REPORT.md`, `CODE_AUDIT_STAGE15.md`, `RELEASE_NOTES_STAGE15.md` | новые |
| `TECHNICAL_BACKLOG.md`, `TRACEABILITY_STAGE2.md` | обновление (живые) |

## Новые зависимости
**Нет.** Pillow уже установлен (thumbnail/phash offline). Провайдер — фейк Этапа 11; реальные SDK —
адаптерные этапы/RV-14.

## Реализуемые требования MASTER_SPEC
§R6.1 (identity по референсам — capability + refs как вход; кондиционирование — RV) · §R6.2 (вымышленные
актёры — safety) · §R6.3 (diversity before generation — сцена как данные) · §R6.4 (similarity cascade —
phash/scene offline, CLIP порт) · §R6.5 (regen `IMAGE_MAX_REGEN` ≠ retry) · §R6.7 (image validator —
порт) · §R6.8 (storage: metadata/thumbnail/phash — post-processing) · §R6.9 (провайдеры через интерфейс+
фабрику) · §R2.10 (только Provider Protocols) · §R3.1 (домен, без БД/HTTP/бизнес-правил) · §R3.8
(pipeline-стадии/энхансеры/валидаторы расширяемы).

## Риски

| # | Риск | Уровень | Митигация |
|---|---|---|---|
| R1 | Нет живых image-API → генерация/identity/CLIP не проверяются | 🟠 | offline на `FakeImageProvider` ~100%; реальное — RV-14 |
| R2 | Identity-conditioning (§R6.1) — сложный, provider-зависимый | 🟡 | refs как вход + capability; реальное кондиционирование — RV-14 |
| R3 | CLIP-валидация/similarity — только порт | 🟡 | phash/scene offline; CLIP — порт (реальное — RV-14) |
| R4 | Provider/model selection связывание | 🟢 | два независимых механизма (req 5); раздельные тесты |
| R5 | Safety Layer «протекает» в генерацию | 🟢 | safety — только проверка (req 8); без генерации |
| R6 | Regen vs infra retry | 🟢 | regen=`IMAGE_MAX_REGEN` (движок) ≠ retry (Executor); документировано |
| R7 | phash-детерминизм | 🟢 | average/dHash через Pillow — детерминирован; тест |

---

## Публичные контракты Этапа 15 (Stable/Internal)

- **Protocol:** потребляемый `ImageProvider` (Этап 11, **Stable**) · `ImageValidator` (**Stable**) ·
  `PromptEnhancer` (**Stable**) · `ImageCostSink` (**Stable**) · `MetricsHook`/`LoggingHook` (**Stable**) ·
  `BatchGenerator`-seam (**Stable**, extension) · `ImageStreamSink`-seam (**Stable**, extension).
- **dataclass / DTO (immutable):** `SceneDescriptor` · `ImageSpec` · `ImageRequest` · `ImageMetadata` ·
  `GeneratedImage` · `Usage` · `AspectRatio` · `ImageValidationResult` · `RegenDecision` (enum) — **Stable**.
- **Pipeline (классы):** `ImagePromptBuilder` · `PromptEnhancementPipeline` · `StylePipeline` ·
  `PostProcessingPipeline` · `ImageEngine` — **Stable**; `SizePolicy` · `SafetyLayer` ·
  `ImageProviderSelector` · `ImageModelRouter` — **Stable**.
- **Fakes:** `FakeImageProvider` (Этап 11) · `FakeImageValidator` — **Internal**.
- **Сервисные интерфейсы (`app/services/images.py`):** `build_image_engine`, `generate_image` — **Stable**.
- **Точки расширения:** реальные провайдеры (Nano Banana/Flux/OpenAI/Ideogram) · реальный `ImageValidator`
  (CLIP/face-embedding) · identity-conditioning · CLIP-similarity · batch-generation · streaming/progressive ·
  cost/metrics/logging-импл.

## Матрица зависимостей

- **Новые входящие (кто импортирует `app/images` [новое]):** `app/services/images.py`, `tests/images/*`.
- **Новые исходящие (что импортирует `app/images` [новое]):** `app/core/providers` (factory/errors/
  observability), `app/images/base` (ImageProvider Этапа 11), `Pillow`, stdlib. **НЕ импортирует**
  `app/content` (AI Engine), `app/validators` (Validation Engine), `app/memory`/`app/rag`,
  `app/api`/`app/services`/`app/db`/`sqlalchemy`.
- **`app/services/images.py` исходящие:** `app/images`, `app/services/providers` (get_image_provider),
  `app/core.config`. services→domain разрешено.
- **Циклы:** отсутствуют — `images` ⊄ content/validators/memory/rag; те ⊄ `images`.
- **Layering guard:** `images` = домен; запрещённые (`app.api`/`app.services`/`app.repositories`/
  `app.db`/`fastapi`) не импортируются → guard зелёный.

## Архитектурная проверка (план)

- **Соответствие MASTER_SPEC:** §R6.1–R6.9 (генерация-оркестрация; identity/CLIP — capability/порт/RV);
  §R2.10 (только Provider Protocols); §R3.1/§R3.8. Diversity/identity/CLIP — данные/порты, не хардкод.
- **Соответствие §R5, §R3.1, §R3.8:** §R5 (E2E: `generate_image` — стадия пайплайна §R13.2) — Image Engine
  как отдельная стадия; §R3.1 — домен, без БД/HTTP/бизнес-правил, composition в services, guard зелёный;
  §R3.8 — стадии/энхансеры/валидаторы/селекторы расширяемы без правки ядра.
- **Влияние на AI Engine:** **нулевое** — Image Engine — параллельная доменная подсистема; `app/content`
  не затрагивается.
- **Влияние на Validation Engine:** **нулевое** — image-validation через собственный порт `ImageValidator`;
  `app/validators` не используется и не изменяется.
- **Влияние на Provider Layer:** **нулевое** — Image Engine — новый потребитель `ImageProvider` (Этап 11)
  через фабрику; провайдер-слой не меняется.
- **Изменение Architecture Freeze:** **не требуется** — новые модули в существующем `app/images`; паттерн
  «протоколы + фейки → реальные адаптеры позже». Новых ADR нет.
- **Потенциальные архитектурные риски:** (1) identity/CLIP/реальная генерация — RV-14; (2) batch/streaming —
  seam'ы; (3) provider/model связывание — раздельные механизмы. Иных системных рисков нет.

---

> **Стоп для утверждения.** К реализации Этапа 15 приступаю только после подтверждения плана. Без
> утверждения Этап 15 не начинаю.
