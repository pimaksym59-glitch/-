# CODE_AUDIT_STAGE15.md — Аудит качества кода Этапа 15 (Image Engine)

**Область:** `app/images/*`, `app/services/images.py`, `tests/images/*`, `tests/services/test_images.py`.
**Дата:** 2026-07-26. **Метод:** self-review + ruff/mypy/pytest/coverage. **Ограничение:** реальные
image-API не вызывались.

---

## 1. Слои / архитектура (§R3.1)
- Image Engine в домене: **без БД-сессии, без HTTP, без бизнес-правил**. `test_layering` зелёный.
- **Независимость:** `app/images` не импортирует content/validators/memory/rag (grep NONE), и они не
  импортируют images. Использует `app/core/providers` (factory/observability) + `app/images/base`
  (ImageProvider Этапа 11) + Pillow.
- Циклов нет.

## 2. Соответствие особым требованиям (1–22)
| # | Требование | Статус |
|---|---|---|
| 1 | Engine — оркестратор без правил | ✅ |
| 2 | только `ImageProvider` Protocol | ✅ (через factory) |
| 3 | Prompt Builder — только базовый | ✅ (`build`/`negative`) |
| 4 | Enhancement модульный (Protocol) | ✅ (`PromptEnhancer`) |
| 5/6 | provider ⟂ model selection | ✅ (раздельные тесты) |
| 7 | Style — отдельный слой | ✅ (`StylePipeline`) |
| 8 | Aspect — модель, без строк | ✅ (`AspectRatio`) |
| 9 | Size — отдельная стратегия | ✅ (`SizePolicy` Protocol) |
| 10 | Safety — только решение | ✅ (не генерирует) |
| 11 | Validation — публичный Protocol | ✅ (`ImageValidator`) |
| 12 | Post-processing — Pipeline (компоненты) | ✅ (`ThumbnailStage`/`PhashStage`) |
| 13 | batch/streaming — seam | ✅ |
| 14 | Metadata immutable | ✅ (frozen; тест) |
| 15/16 | cost/metrics/logging — hooks | ✅ |
| 17 | runtime не имитируется | ✅ (RV-14) |
| 18 | фейки детерминированы | ✅ |
| 19/20/21/22 | контракты/матрица/архитектура/новые API | ✅ (STAGE15_REPORT §5–8) |

## 3. Типизация / стиль
- `mypy --strict` — **0 ошибок (263 файла), 0 `type: ignore`**. `ruff` — All checks passed. Без warnings.
- Все интерфейсы — `Protocol`; DTO — `@dataclass(frozen=True, slots=True)`; Aspect — модель (не строки);
  frozen-тест через `setattr` с переменным именем (обходит B010 без `type: ignore`).

## 4. Корректность (ключевые точки)
- **Раздельность стадий:** build (base) → style → enhancement — три независимых шага (тесты проверяют
  каждый и отсутствие смешивания).
- **Provider ⟂ model:** `ImageModelRouter` не требует factory/провайдера (тест доказывает).
- **Size policy:** landscape/portrait/square → корректные (w,h), кратные 64, в пределах лимитов.
- **Safety (§R6.2):** real-person/banned → блок (verdict.allowed=False); **генерации нет**; engine
  бросает `SafetyRejected` до вызова провайдера.
- **Regen (§R6.5):** петля до `IMAGE_MAX_REGEN`; при исчерпании — `passed=False` (не исключение);
  ≠ infra retry.
- **Post-processing:** phash — average-hash через `tobytes()` (детерминирован; тест на дискриминацию);
  thumbnail — Pillow.
- **Метаданные (§R6.8):** prompt/negative/size/scene/phash/model/provider — собраны; immutable.

## 5. Тесты / покрытие
- **18 offline-тестов** (aspect/size, prompt/style/enhancement, safety, post-processing, regen, selection,
  engine end-to-end, seams, composition). Детерминированы (FakeImageProvider — solid-color по хэшу).
- coverage подсистемы **100%** (`app/images` + `services/images`).

## 6. Наблюдения / риски
| # | Наблюдение | Severity | Примечание |
|---|---|---|---|
| A | Реальные провайдеры/CLIP/identity не вызывались | 🟢 | по замыслу; RV-14 |
| B | Model/negative не передаются в `provider.generate` | 🟡 | Stage-11 protocol без этих аргументов; в metadata; расширение |
| C | phash фейка = 0 (solid image) | 🟢 | природа фейка; phash-стадия корректна (тест на реальном PNG) |
| D | batch/streaming — seam | 🟢 | точки расширения; без реализации |

## 7. Технический долг
Нет. `print`/`type: ignore`/`TODO`/`random`/`time.time` отсутствуют; `getdata` заменён на `tobytes`
(без deprecation). Дублирования нет (reuse providers.observability). Секретов в коде нет.

## 8. Трассируемость
§R6.1–R6.9, §R2.10, §R3.1/R3.8 — Implemented + Statically Verified (offline); реальная генерация/CLIP/
identity — Pending (RV-14). См. `TRACEABILITY_STAGE2.md` (Этап 15, требования 132–144).

## 9. Вердикт
**Этап 15 — чисто (offline).** Provider-agnostic Image Engine поверх `ImageProvider` Этапа 11: раздельные
prompt/style/enhancement, независимые provider/model selection, aspect-модель + size-стратегия, safety
(только решение), validation через порт, post-processing pipeline, regen ≠ retry; batch/streaming/cost —
seam'ы/hooks. Строго типизирован (0 `type: ignore`); покрытие 100%. Долга нет. **RV-14 — реальные
провайдеры/CLIP/identity.** Готов к Этапу 16 после подтверждения.
