# TASK_BREAKDOWN — Stage 19 (System Verification & Integration Test Infrastructure)

**Требует утверждения перед реализацией. К реализации не приступать без явного разрешения владельца.**

Цель (§R13.1 шаг 19, §R13.2/§R13.4, §R12.12, §R2.10, §R3.9): **независимая от production подсистема
тестовой инфраструктуры** — переиспользуемый оффлайн-harness: Test Architecture + Test Pyramid, Unit/
Integration/Contract/E2E-архитектуры, детерминированная Fake Infrastructure, Fixtures (отдельно) и Factories
(отдельно), воспроизводимая генерация данных, и **девять отдельных стратегий** (Snapshot / Property-based /
Mutation / Performance / Concurrency / Stress / Chaos / Compatibility / Regression), Test Reporting и Coverage
как **отдельные компоненты**, seam'ы CI/CD и distributed execution **без реализации**. Плюс репрезентативные
**E2E-сценарии пайплайна** (§R13.2) и **contract-тесты** (фейки ⊨ публичным Protocol) — всё offline и
детерминированно. **Никаких реальных нагрузочных/chaos/production-интеграционных прогонов; никаких изменений
production-архитектуры; интеграция с production — только через публичные Protocol.** Architecture Freeze
ACTIVE; SoT — MASTER_SPEC.

## Границы объёма (важно)

Этап 19 — **инфраструктура верификации и репрезентативные тесты**, а НЕ реальные распределённые/нагрузочные
прогоны. **Вне объёма Этапа 19** (RV-18): реальные integration-тесты против живых PostgreSQL/Redis/внешних
API (уже RV-4…RV-9/RV-10…RV-17), реальный performance/load, реальный chaos/fault-injection под нагрузкой,
реальный запуск mutation-тестов (mutmut), property-based через Hypothesis в CI-масштабе, реальный CI/CD-
пайплайн и distributed test execution (pytest-xdist), enforcement покрытия в CI. Стратегии реализуются как
**модели/раннеры/решения** (детерминированные, offline); реальные инструменты — seam'ы.

## Размещение (по §R3.1, req 1/2)

**Подсистема тестирования размещается ВНЕ `app/`** — в пакете **`tests/framework/`** (test-support), чтобы
быть **независимой от production-кода** (req 1) и **не менять архитектуру production-подсистем** (req 2). Ни
один модуль `app/` не изменяется и **не импортирует** `tests/`. Framework импортирует production **только
через публичные поверхности**: composition-функции `app.services.*` (`build_*`), инвентарь фейков подсистем
(`app.<subsystem>.fakes`) и публичные DTO/Protocol/enum — **никаких приватных внутренностей**. Новых
зависимостей нет (Hypothesis/mutmut/pytest-benchmark/pytest-xdist — только seam'ы, не ставятся). `mypy
--strict` покрывает `tests/` — framework строго типизирован, `0 type: ignore`.

---

## ⚠️ Ограничение среды (нет живых сервисов/нагрузки/CI)

По требованию — не выполнять реальные нагрузочные/chaos/production-интеграционные тесты. **Три статуса (req
24):**
- **Implemented / Statically Verified (offline):** весь harness offline на детерминированных фейках —
  pyramid/architecture/markers, data-generation, factories, fixtures, fake-catalogue, 9 стратегий (модели/
  раннеры/решения), reporting, coverage-policy, seam'ы; репрезентативные E2E-сценарии пайплайна и contract-
  тесты фейков. Покрытие подсистемы ~100%.
- **Runtime Verification Pending (RV-18):** реальные integration против живых PG/Redis/API (наследует
  RV-4…RV-17), реальный performance/load, реальный chaos под нагрузкой, реальный mutation-run, Hypothesis/
  pytest-xdist в CI, реальный CI/CD-пайплайн, enforcement покрытия. Интеграционные — `skipif`
  (`RUN_INTEGRATION=1`).

## Особые требования владельца (1–24) — карта на реализацию

1 подсистема тестирования независима от production → пакет `tests/framework/` (вне `app/`), grep-guard ·
2 не менять архитектуру production → ни один файл `app/` не трогается; `app/` не импортирует `tests/` ·
3 тестовые адаптеры только через публичные Protocol → framework импортирует только `app.services.*`
(`build_*`)/`app.*.fakes`/публичные DTO/Protocol · 4 Fake Infrastructure детерминирована → инъекция Clock/
Id/seed, без random · 5 Fixtures — отдельный модуль → `fixtures.py` · 6 Factories отдельно от Fixtures →
`factories.py` · 7 генерация данных воспроизводима → `data.py` (SeededGenerator, без `random`/времени) ·
8–16 стратегии — **каждая отдельным модулем**: `snapshot.py`/`property_based.py`/`mutation.py`/
`performance.py`/`concurrency.py`/`stress.py`/`chaos.py`/`compatibility.py`/`regression.py` · 17 Test
Reporting — отдельный компонент → `reporting.py` · 18 Coverage — отдельный компонент → `coverage.py` ·
19 CI/CD seam'ы без реализации → `seams.py` · 20 distributed execution seam'ы без реализации → `seams.py` ·
21 без реальных нагрузочных/chaos/production-интеграционных → только модели/решения/фейки · 22 фейки
детерминированы · 23 публичные интерфейсы — Protocol (где осмысленно) · 24 три статуса.

## Ключевые архитектурные развязки

- **Независимость от production (req 1/2):** производственный код о тестовом ничего не знает; инвариант
  «`app/` не импортирует `tests/`» проверяется guard-тестом. Framework — потребитель публичных поверхностей.
- **Fixtures ⟂ Factories (req 5/6):** Factories — чистые построители объектов (детерминированные значения по
  умолчанию, override-параметры); Fixtures — сборка готовых подсистем/окружений (через `build_*`), опираются
  на Factories, но не наоборот.
- **Детерминизм (req 4/7/22):** ни `random`, ни `time.time`, ни `datetime.now` — сид/часы/идентификаторы
  инъектируются (`SeededGenerator`/`FakeClock`); один и тот же seed → идентичные данные и снапшоты.
- **9 стратегий — отдельные модули, единый паттерн:** каждая = Protocol/модель + детерминированный offline-
  раннер/решение; реальный тяжёлый инструмент (Hypothesis/mutmut/load/chaos) — seam (RV-18). Chaos/Stress не
  исполняют реальные сбои — моделируют fault-injection через порты фейков (req 21).
- **Contract Test Architecture:** проверка, что каждый `Fake*` подсистемы **структурно удовлетворяет**
  своему публичному Protocol (§R2.10) — ловит дрейф контрактов без живых сервисов.
- **E2E Architecture:** оффлайн-прогон 5-стадийного пайплайна (§R13.2) через публичные фасады движков на
  фейках (chaining/continuation, T-E-01/02/03); полный queue-runtime E2E — RV-7/RV-18.

---

## Последовательность задач

### T19.0 — Зависимости + gate + размещение
- **Новых зависимостей нет.** Hypothesis/mutmut/pytest-benchmark/pytest-xdist/coverage-CI — только seam'ы
  (не ставятся, RV-18). Создать пакет `tests/framework/` (+ при необходимости `tests/e2e/`,
  `tests/contract/`). **`app/` не изменять.**
- **Критерий:** нет новых пакетов; `tests/framework` не импортирует приватные внутренности `app` (grep —
  только `app.services.*`/`app.*.fakes`/публичные DTO/Protocol); `app/` не импортирует `tests` (guard).

### T19.1 — Test Architecture + Test Pyramid + markers
- `tests/framework/architecture.py` — `TestLevel` StrEnum (`UNIT/INTEGRATION/CONTRACT/API/MIGRATION/E2E`),
  `TestCategory`, метаданные уровней. `tests/framework/pyramid.py` — `TestPyramid` (доли/пороги покрытия по
  уровням из TEST_PLAN §«Уровни»). `tests/framework/markers.py` — централизованные pytest-маркеры
  (`integration`/`e2e`/`contract`/…) + gating `RUN_INTEGRATION`.
- **Критерий:** уровни/пороги типизированы и соответствуют TEST_PLAN; маркеры регистрируются единообразно;
  unit.

### T19.2 — Deterministic Data Generation (req 7)
- `tests/framework/data.py` — `SeededGenerator` (детерминированные строки/ids/timestamps/векторы фикс.
  размерности из seed; **без `random`**, через хеш/счётчик), `DeterministicClock`. Воспроизводимо: тот же
  seed → те же данные.
- **Критерий:** одинаковый seed → идентичный вывод; нет `random`/времени; unit на воспроизводимость.

### T19.3 — Test Factories (req 6)
- `tests/framework/factories.py` — фабрики публичных DTO (`Event`/`AuditEvent`/`ChannelRecord`/`UserRecord`/
  `PublishRequest`/`GenerationRequest`/… через публичные типы подсистем) с детерминированными дефолтами и
  override-параметрами. Опираются на `data.py`. **Отдельно** от Fixtures.
- **Критерий:** фабрики строят валидные immutable DTO; детерминированы; unit на каждую группу.

### T19.4 — Test Fixtures (req 5)
- `tests/framework/fixtures.py` — переиспользуемые pytest-фикстуры, собирающие готовые подсистемы через
  **публичные** `build_*` (`build_analytics_engine`/`build_admin_api`/AI/RAG/… composition) и наборы фейков.
  Опираются на Factories/Data. **Отдельный модуль** от Factories.
- **Критерий:** фикстуры возвращают рабочие offline-подсистемы; детерминированы; используются в E2E/contract.

### T19.5 — Fake Infrastructure catalogue (req 3/4) + ports
- `tests/framework/ports.py` — общие Protocol'ы harness (`Clock`/`IdFactory`/`SnapshotStore`/`TestReporter`/
  `FaultInjector`/`WorkloadModel`/`CoveragePolicyPort`). `tests/framework/fakes.py` — **каталог/реестр**
  детерминированных фейков подсистем (реэкспорт `app.*.fakes` через публичный API) + кросс-срезовые дубли.
- **Критерий:** каталог перечисляет все фейки; ничего наружу не шлёт; unit на детерминизм каталога.

### T19.6 — Unit Test Architecture
- `tests/framework/unit.py` — конвенции/помощники уровня Unit (чистая логика, ветви ≥90% для домена, §R3.9);
  небольшой репрезентативный unit-harness (пример на существующем чистом модуле).
- **Критерий:** харнесс запускает чистый unit детерминированно; unit.

### T19.7 — Integration Test Architecture (gated)
- `tests/framework/integration.py` — gated-harness: маркер `integration` + `skipif(RUN_INTEGRATION!=1)`,
  контракт «тела против БД/сети не исполняются без сервисов» (§R3.9/§R12.12). Реальные пути — RV-18.
- **Критерий:** integration-харнесс корректно скипается offline; unit на логику gating.

### T19.8 — Contract Test Architecture
- `tests/framework/contract.py` — `ProtocolConformance` (проверка, что объект структурно удовлетворяет
  Protocol) + реестр пар «Fake ⊨ Protocol». `tests/contract/test_fakes_conform.py` — фейки подсистем ⊨
  публичным Protocol (§R2.10).
- **Критерий:** несоответствие фейка контракту → падение; все текущие фейки проходят; unit.

### T19.9 — End-to-End Test Architecture (§R13.2)
- `tests/framework/e2e.py` — оффлайн-оркестратор 5-стадийного пайплайна (`generate_text`→`validate`→
  `generate_image`→`publish`→`collect_metrics`) через публичные фасады на фейках; модель continuation-
  chaining. `tests/e2e/test_pipeline.py` — **T-E-01** happy-path, **T-E-02** fail-`validate`→следующая
  стадия не ставится, **T-E-03** LEAD_TIME-деферал (модельно). Полный queue-runtime — RV.
- **Критерий:** happy-path проходит end-to-end offline; сбой стадии останавливает цепочку; детерминизм; unit.

### T19.10–T19.18 — Стратегии (каждая отдельным модулем, req 8–16)
- **T19.10 Snapshot** `snapshot.py` — `SnapshotStrategy` + `SnapshotStore` порт + детерминированная
  сериализация/сравнение (обновление по флагу). **Критерий:** совпадение/расхождение снапшота; unit.
- **T19.11 Property-based** `property_based.py` — `PropertyStrategy` + детерминированный seed-раннер
  (генерация кейсов из `SeededGenerator`, поиск контрпримера); Hypothesis — seam. **Критерий:** свойство
  подтверждается/находит контрпример детерминированно; unit.
- **T19.12 Mutation** `mutation.py` — `MutationStrategy` + операторы мутаций (модель) + решение «killed/
  survived»; реальный mutmut — seam. **Критерий:** модель отмечает выжившую мутацию; unit.
- **T19.13 Performance** `performance.py` — `PerformanceStrategy` + бюджеты/пороги через `DeterministicClock`
  (решение pass/fail); реальный load — seam (RV-18). **Критерий:** превышение бюджета → fail; unit.
- **T19.14 Concurrency** `concurrency.py` — `ConcurrencyStrategy` + детерминированная модель
  interleaving/барьеров (без реальной гонки); реальная параллельность — seam. **Критерий:** детект
  небезопасного порядка на модели; unit.
- **T19.15 Stress** `stress.py` — `StressStrategy` + `WorkloadModel` (объём/пик), решение о деградации;
  реальный stress — seam (req 21). **Критерий:** модель сигналит порог; unit.
- **T19.16 Chaos** `chaos.py` — `ChaosStrategy` + `FaultInjector` порт (детерминированная инъекция сбоев в
  фейки: 429/timeout/permanent — из инвентаря §R2.10); реальный chaos — seam (req 21). **Критерий:**
  инъекция сбоя воспроизводимо меняет исход; unit.
- **T19.17 Compatibility** `compatibility.py` — `CompatibilityStrategy` + матрица версий (Python `>=3.13`,
  объявленные пакеты), решение совместимости (данные); реальная кросс-версионная прогонка — seam.
  **Критерий:** матрица отмечает несовместимость; unit.
- **T19.18 Regression** `regression.py` — `RegressionStrategy` + baseline capture/compare (поверх
  `snapshot`), детект регрессии. **Критерий:** изменение против baseline → регрессия; unit.

### T19.19 — Test Reporting (req 17)
- `tests/framework/reporting.py` — `TestReporter` Protocol + `TestResult`/`TestReport` DTO +
  детерминированный in-memory reporter; JUnit/HTML/CI-экспорт — seam (RV-18).
- **Критерий:** reporter агрегирует результаты детерминированно; unit; экспорт-seam raises NotImplemented.

### T19.20 — Coverage (req 18)
- `tests/framework/coverage.py` — `CoveragePolicy` (пороги по уровням из TEST_PLAN: строки ≥85%, домен выше)
  + `CoverageReadPort` + решение pass/fail; реальная интеграция coverage-инструмента/enforcement — seam.
- **Критерий:** политика отклоняет недостаточное покрытие (на модельных числах); unit.

### T19.21 — CI/CD + distributed execution seams (req 19/20)
- `tests/framework/seams.py` — `CiPipeline` seam (format→static→tests, §R12.12) и `DistributedRunner` seam
  (xdist/удалённое исполнение) — Protocol'ы + заглушки `NotImplementedError` (RV-18). Без реальных SDK.
- **Критерий:** seam'ы присутствуют, ничего не исполняют; grep нет CI/xdist SDK; unit (seam raises).

### T19.22 — Тесты framework + E2E + contract + independence
- `tests/framework/test_*` (по модулю), `tests/e2e/test_pipeline.py`, `tests/contract/test_fakes_conform.py`,
  `tests/framework/test_independence.py` (AST-guard: framework не тянет приватные внутренности `app`; `app`
  не импортирует `tests`). Все offline/детерминированы.
- **Критерий:** ~100% покрытие framework; guard/contract/E2E зелёные; integration — `skipif`.

### T19.23 — Gate + отчёты + живые доки + коммиты + тег
- `ruff` (format+check), `mypy --strict` (0 ошибок, **0 `type: ignore`**), `pytest`.
- `STAGE19_REPORT.md`, `CODE_AUDIT_STAGE19.md`, `RELEASE_NOTES_STAGE19.md`; обновить `TECHNICAL_BACKLOG.md`
  (+RV-18), `TRACEABILITY_STAGE2.md` (блок Этапа 19 + отметка покрытия проверяемых `R*`), `TEST_PLAN.md`
  (при необходимости), README-секцию.
- 3 коммита `feat/test/docs(stage-19):` + тег `stage-19-tests`. **СТОП на приёмку.**
- **Критерий:** все гейты зелёные; отчёты с тремя статусами; 3 коммита + 1 тег; следующий этап не начат.

---

## Создаваемые файлы (сводно)

**`tests/framework/`:** `__init__.py`, `ports.py`, `architecture.py`, `pyramid.py`, `markers.py`, `data.py`,
`factories.py`, `fixtures.py`, `fakes.py`, `unit.py`, `integration.py`, `contract.py`, `e2e.py`,
`snapshot.py`, `property_based.py`, `mutation.py`, `performance.py`, `concurrency.py`, `stress.py`,
`chaos.py`, `compatibility.py`, `regression.py`, `reporting.py`, `coverage.py`, `seams.py`.
**Тесты framework:** `tests/framework/test_*` + `tests/framework/test_independence.py`.
**Сценарии:** `tests/e2e/__init__.py`, `tests/e2e/test_pipeline.py`; `tests/contract/__init__.py`,
`tests/contract/test_fakes_conform.py`. **Доки:** `STAGE19_REPORT.md`, `CODE_AUDIT_STAGE19.md`,
`RELEASE_NOTES_STAGE19.md`; апдейт `TECHNICAL_BACKLOG.md`, `TRACEABILITY_STAGE2.md`, `TEST_PLAN.md`,
`README.md`. **`app/` — не изменяется.**

## Требования MASTER_SPEC, реализуемые на Этапе 19

- **§R13.2** — E2E 5-стадийный пайплайн (offline-сценарии T-E) — *Implemented (offline)*; queue-runtime — RV.
- **§R13.4** — release-критерии: тесты зелёные (unit+gated integration), **traceability покрывает
  проверяемые `R*`** — *Statically Verified* (обновление traceability); backup/monitoring — §R12.13/RV.
- **§R12.12** — CI (format→static→tests; unit всегда, integration gated) — *Implemented (seam + gating)*;
  реальный CI-пайплайн — RV-18.
- **§R2.10** — offline-фейки/contract-conformance — *Implemented / Statically Verified*.
- **§R3.9** — unit vs integration разделение — *Implemented*.
- **§R2.6** — изоляция канала как проверяемый инвариант — *Implemented (в сценариях/фабриках)*.
- **§R3.1 / §R3.8** — размещение вне `app/`, расширяемость стратегий/репортеров — *Statically Verified*.
- **Вне объёма / RV-18:** реальный integration/performance/chaos/mutation/Hypothesis/CI/distributed/coverage-
  enforcement.

## Риски

| # | Риск | Митигируется |
|---|---|---|
| R1 | Framework тянет приватные внутренности `app` → связность с production | только публичные `build_*`/`fakes`/DTO; grep + independence-тест (req 1/3) |
| R2 | Изменение production-архитектуры ради тестов | `app/` не трогается; `app/` не импортирует `tests` (guard, req 2) |
| R3 | Стратегии превращаются в реальные тяжёлые прогоны | модели/решения offline; реальные инструменты — seam'ы (req 21, RV-18) |
| R4 | Недетерминизм (random/time) | seed/Clock/Id инъекция; без `random`/времени (req 4/7/22) |
| R5 | E2E требует полного queue-runtime | offline-оркестратор через публичные фасады; полный queue-E2E — RV |
| R6 | Новые зависимости (Hypothesis/mutmut/xdist) | не ставятся; только seam'ы; gate T19.0 |
| R7 | Раздувание объёма (~25 модулей) | строгая декомпозиция ≤400 строк; общие порты в `ports.py` |
| R8 | Ложное впечатление о готовности CI/load/chaos | три статуса + RV-18 во всех отчётах и seam'ах |

---

## Публичные контракты Этапа 19

**Protocol (Stable Public Contract):** `Clock` · `IdFactory` · `SnapshotStore` · `TestReporter` ·
`FaultInjector` · `WorkloadModel` · `CoverageReadPort` · `SnapshotStrategy` · `PropertyStrategy` ·
`MutationStrategy` · `PerformanceStrategy` · `ConcurrencyStrategy` · `StressStrategy` · `ChaosStrategy` ·
`CompatibilityStrategy` · `RegressionStrategy` · `ProtocolConformance` · `CiPipeline` · `DistributedRunner`.

**dataclass / DTO (immutable — Stable Public Contract):** `TestLevelMeta` · `PyramidTier` · `TestResult` ·
`TestReport` · `SnapshotRecord` · `PropertyCase` · `MutationOutcome` · `PerfBudget`/`PerfResult` ·
`WorkloadSpec` · `FaultSpec` · `CompatibilityMatrix` · `RegressionBaseline` · `CoverageThreshold`/
`CoverageResult`.

**Enum (Stable Public Contract):** `TestLevel` · `TestCategory` · `FaultKind` (429/timeout/permanent) ·
`MutationOperator`.

**Registry (Stable Public Contract):** `MarkerRegistry` · `FakeCatalogue` · contract-реестр «Fake ⊨ Protocol».

**Factory (Stable Public Contract):** фабрики DTO в `factories.py` (`make_event`/`make_audit_event`/
`make_channel_record`/`make_publish_request`/…) · `SeededGenerator`.

**Fixture (Stable Public Contract):** переиспользуемые фикстуры `fixtures.py` (`analytics_engine`/
`admin_api`/`ai_engine`/`rag_*`/`pipeline_env`/…).

**Strategy (Stable Public Contract):** конкретные стратегии — `Snapshot`/`Property`/`Mutation`/`Performance`/
`Concurrency`/`Stress`/`Chaos`/`Compatibility`/`Regression` (реализации соответствующих Protocol).

**Reporter (Stable Public Contract):** `InMemoryTestReporter` · `CoveragePolicy`.

**Точки расширения (Stable seam — реализация RV-18):** `CiPipeline`/`DistributedRunner` (CI/CD, xdist) ·
Hypothesis-адаптер (`PropertyStrategy`) · mutmut-адаптер (`MutationStrategy`) · load-tool (`Performance`) ·
реальные integration-бэкенды · JUnit/HTML/coverage-tool экспортёры.

**Fakes/helpers (Internal Contract):** `FakeClock`/`DeterministicClock` · `FakeSnapshotStore` ·
`FakeFaultInjector` · `FakeCoverageSource` · in-memory каталог фейков.

---

## Матрица зависимостей

- **Новые входящие (кто импортирует `tests/framework` [новое]):** `tests/framework/test_*`, `tests/e2e/*`,
  `tests/contract/*`, а также (по мере переноса) существующие тесты. **`app/` — НЕ импортирует** `tests`
  (guard-тест).
- **Новые исходящие (что импортирует `tests/framework` [новое]):** **stdlib** + **только публичные
  поверхности** `app`: `app.services.*` (`build_*`), `app.<subsystem>.fakes`, публичные DTO/Protocol/enum
  подсистем. **НЕ импортирует** приватные внутренности, не добавляет сторонних пакетов (Hypothesis/mutmut/
  xdist — seam'ы).
- **Циклы:** отсутствуют — `tests/framework` — потребитель; production от него не зависит; Fixtures→Factories→
  Data однонаправлено; стратегии независимы.
- **Layering guard:** `app/` не меняется → `tests/test_layering.py` остаётся зелёным; добавляется
  independence-guard уровня framework (app ⊄ tests; framework ⊄ private app internals).

## Архитектурная проверка (план)

- **Соответствие MASTER_SPEC:** §R13.2/§R13.4 (E2E/release/traceability), §R12.12 (CI-уровни), §R2.10
  (offline-фейки), §R3.9 (unit/integration), §R2.6 (изоляция), §R3.1/§R3.8.
- **Соответствие §R3.1, §R3.8:** §R3.1 — тестовая подсистема вне `app/`, не нарушает слои production; §R3.8 —
  стратегии/репортеры/фикстуры расширяемы регистрацией и инъекцией портов.
- **Влияние на AI Engine:** **нулевое** — `app/content` не изменяется (только публичные фасады/фейки).
- **Влияние на Validation Engine:** **нулевое** — `app/validators` не изменяется.
- **Влияние на Image Engine:** **нулевое** — `app/images` не изменяется.
- **Влияние на Telegram Engine:** **нулевое** — `app/telegram` не изменяется.
- **Влияние на Analytics:** **нулевое** — `app/analytics` не изменяется.
- **Влияние на Admin:** **нулевое** — `app/admin` не изменяется.
- **Влияние на Provider Layer:** **нулевое** — `app/core/providers` не изменяется.
- **Требуется ли изменение Architecture Freeze:** **нет** — новая инфраструктура **вне** `app/`, production
  не затрагивается; паттерн «Protocol + фейки → реальные инструменты позже (RV)»; новых ADR нет.
- **Потенциальные архитектурные риски:** (1) реальные integration/load/chaos/mutation/CI — RV-18;
  (2) независимость от production — grep-guard + independence-тест; (3) детерминизм — seed/Clock/Id;
  (4) объём — модульная декомпозиция ≤400 строк. Иных нет.

---

## Что НЕ делается на Этапе 19 (явные границы)

Реальные integration-прогоны против живых PG/Redis/внешних API, реальный performance/load, реальный chaos/
fault-injection под нагрузкой, реальный mutation-run (mutmut), Hypothesis/pytest-xdist в CI, реальный CI/CD-
пайплайн и distributed execution, enforcement покрытия в CI, а также **любые изменения в `app/`** и новые
зависимости. Всё это — последующие стадии/DevOps §R12.13 и **RV-18**.

**После подготовки этого файла — СТОП. К реализации Этапа 19 не приступать без явного утверждения владельца.**
