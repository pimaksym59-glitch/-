# TASK_BREAKDOWN — Stage 20 (Documentation, Release Engineering & Production Readiness)

**Требует утверждения перед реализацией. К реализации не приступать без явного разрешения владельца.**
**Финальный этап (§R13.1 шаг 20).**

Цель (§R13.1 шаг 20, §R12.6–R12.15, §R13.4/§R13.5): **полная документационная иерархия + release
engineering + DevOps-артефакты + итоговые сводки готовности** — без изменения production-кода. Строится
структурированное дерево `docs/` (Architecture / API / Developer / Operations / Deployment / Security /
Runbooks / Troubleshooting / Release / Support), отдельная подсистема **Release Engineering** (versioning /
release-/deployment-/production-readiness-checklist / upgrade / rollback / packaging), **Disaster Recovery**,
**Environment Matrix**, **Maintenance/Support**, DevOps-артефакты (CI/CD-шаблон, Makefile, dependency-lock),
а также **итоговые карты и сводки** проекта (architecture map, dependency map, requirements matrix, ADR
summary, RV-list, production-readiness summary, project-completion summary). **Никаких реальных деплоев/
публикаций/релизов; никаких изменений `app/`, публичных Protocol, архитектурных зависимостей, бизнес-логики.**
Architecture Freeze ACTIVE; SoT — MASTER_SPEC.

## Границы объёма (важно, req 1–5)

Этап 20 меняет **только** документацию, release engineering, packaging, developer tooling и DevOps-артефакты
(req 2). **НЕ изменяются:** архитектура production-кода (req 1), бизнес-логика подсистем (req 3), публичные
Protocol (req 4), архитектурные зависимости (req 5). **Ни один файл `app/` не редактируется** (guard-проверка
`git diff --name-only` не содержит `app/`). Тесты Этапа 19 остаются зелёными без изменений.

## Размещение (по §R3.1)

Всё — **вне `app/`**: дерево **`docs/`** (уже есть `docs/adr`, `docs/spec` — не трогаем, дополняем),
корневые артефакты (`CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `Makefile`,
`PROJECT_COMPLETION_SUMMARY.md`), DevOps-шаблоны (`.github/workflows/ci.yml`, dependency-lock). Reverse-
трассировка на MASTER_SPEC/существующие спеки (API_SPEC/DATABASE_SPEC/TEST_PLAN/TECHNICAL_BACKLOG/
TRACEABILITY) — ссылками, без дублирования истины.

---

## ⚠️ Ограничение среды (нет реального деплоя/CI/публикации)

По требованию — не выполнять реальные деплои/публикацию пакетов/релизы (req 21). **Три статуса (req 23):**
- **Implemented / Statically Verified (offline):** вся документация, чек-листы, шаблоны, карты и сводки —
  написаны, внутренне согласованы, перекрёстно связаны; CI/CD — **шаблон** (не запускается); packaging/
  dependency-lock — процедура + артефакт-заготовка; детерминированные шаблоны/чек-листы (req 22).
- **Runtime Verification Pending (RV):** реальный запуск CI/CD-пайплайна, реальная генерация `uv.lock`
  (нужен `uv` + сеть), реальная сборка/публикация образа, реальные backup/restore/deploy/rollback на
  живой инфраструктуре, production-readiness review на живом стенде — наследуют RV-1…RV-18 (см.
  «Итоговый RV»). Ничего из этого в Этапе 20 не исполняется.

## Особые требования владельца (1–30) — карта на реализацию

1 не менять архитектуру `app/` → guard `git diff` без `app/` · 2 только docs/release/packaging/tooling/
DevOps · 3 не менять бизнес-логику · 4 не менять публичные Protocol · 5 не менять зависимости-импорты ·
6 полная doc-иерархия → дерево `docs/` · 7 разделы Architecture/API/Developer/Operations/Deployment/
Security/Runbooks/Troubleshooting/Release → подпапки · 8 Release Engineering — отдельная подсистема doc →
`docs/release/` · 9 Versioning отдельно · 10 Release Checklist отдельно · 11 Deployment Checklist отдельно ·
12 Production Readiness Checklist отдельно · 13 Disaster Recovery отдельно · 14 Upgrade отдельно · 15
Rollback отдельно · 16 Packaging отдельно · 17 Environment Matrix отдельно · 18 Support отдельно · 19
Maintenance отдельно · 20 seam'ы автоматизации релизов без реализации · 21 без реальных деплоев/публикаций ·
22 шаблоны/чек-листы детерминированы (без «сегодняшних» дат — плейсхолдеры) · 23 три статуса · 24 итоговая
карта архитектуры · 25 финальная карта зависимостей подсистем · 26 итоговая матрица `R*` по этапам · 27
итоговый ADR Summary · 28 итоговый RV-список · 29 Production Readiness Summary · 30 Project Completion
Summary.

## Ключевые архитектурные развязки

- **Документация — не источник истины, а навигатор:** MASTER_SPEC остаётся SoT; docs ссылаются на него и на
  спеки/отчёты, не переписывая требования (нет дрейфа).
- **CI/CD — шаблон, не исполнение (req 20/21):** `.github/workflows/ci.yml` кодирует §R12.12 (format→static→
  tests→build→migration-check→deploy), но реальный прогон/деплой — RV; deploy-шаги gated/manual.
- **Deterминизм (req 22):** чек-листы/шаблоны без изменяющихся значений (даты/хеши — плейсхолдеры
  `<VERSION>`/`<DATE>`); один и тот же вход → один и тот же документ.
- **Итоговые сводки — производные:** architecture/dependency/requirements карты собираются из уже
  зафиксированных STAGE*-отчётов/TRACEABILITY/TECHNICAL_BACKLOG (консолидация, не новая истина).

---

## Последовательность задач

### T20.0 — Gate + scope guard
- Зафиксировать зелёный baseline (ruff/mypy/pytest — **466 passed / 6 skipped**). Новых зависимостей нет.
- **Критерий:** baseline зелёный; план не предполагает правок `app/`/Protocol/зависимостей.

### T20.1 — Documentation Architecture + Taxonomy (req 6, 7)
- `docs/README.md` (корневой индекс/навигация), `docs/TAXONOMY.md` (**Documentation Taxonomy**: категории ×
  аудитория × статус Implemented/SV/RV). Определяет иерархию всех разделов.
- **Критерий:** индекс покрывает все разделы req 7; таксономия типизирует документ (категория/аудитория/
  статус); все ссылки валидны.

### T20.2 — Architecture Documentation (req 24, 25, 27)
- `docs/architecture/overview.md` (модульный монолит, слои §R3.1/§R3.8), `subsystem-map.md` (**итоговая
  карта архитектуры**, req 24: все подсистемы Этапов 1–19 + связи), `dependency-map.md` (**финальная карта
  зависимостей**, req 25), `data-model.md` (25 таблиц §R4, ссылка на DATABASE_SPEC), `pipeline.md` (5-стадийный
  E2E §R13.2), `adr-summary.md` (**Architectural Decision Summary**, req 27: Appendix A + ADR-001/002).
- **Критерий:** карта охватывает все реализованные подсистемы; зависимости совпадают с STAGE*-матрицами;
  циклов нет (сверка с guard); ADR-summary консолидирует решения.

### T20.3 — API Documentation (req 7)
- `docs/api/rest-reference.md` (эндпоинты §API_SPEC), `errors.md` (единая Error Schema), `rbac.md` (матрица
  §R10.5), `pagination.md`. Ссылки на `API_SPEC.md` (SoT контракта).
- **Критерий:** покрыты все области API_SPEC; RBAC-матрица совпадает с `app/admin/rbac.py`; статусы (runtime
  API — RV-9).

### T20.4 — Developer Documentation (req 7)
- `docs/developer/getting-started.md` (venv/gate-команды), `coding-standards.md` (§3/§12: ruff/mypy-strict/
  0 type:ignore/PEP695), `testing-guide.md` (пирамида/фейки/`RUN_INTEGRATION`, ссылка на TEST_PLAN + Stage 19
  framework), `extension-points.md` (реестр seam'ов/RV по подсистемам); корневой `CONTRIBUTING.md`.
- **Критерий:** новичок собирает окружение и проходит gate по инструкции; extension-points перечисляет все
  seam'ы; ничего в `app/` не меняется.

### T20.5 — Operations Documentation (req 19) + Disaster Recovery (req 13)
- `docs/operations/monitoring.md` (§R12.10 liveness≠readiness, алерты, dead-man's-switch), `logging.md`
  (§R12.9 JSON-логи/audit), `maintenance.md` (**Maintenance**, §R8.12: backup/cleanup/reindex/health_check),
  `disaster-recovery.md` (**Disaster Recovery**, §R12.7/§R12.8: backup-стратегия, restore-проверки,
  «непроверенный бэкап = нет бэкапа»).
- **Критерий:** процедуры полны и трассируются на §R12; реальный мониторинг/backup — RV.

### T20.6 — Deployment Documentation (req 7, 17) + Migrations
- `docs/deployment/docker.md` (§R12.3–R12.5: один образ/роли/Caddy/сеть), `environment-matrix.md`
  (**Environment Matrix**, req 17, §R12.1: Dev/Test/Staging/Prod × env/БД/секреты/логи), `configuration.md`
  (§R3.4/§Appendix B config-first), `secrets.md` (§R12.2 secret manager/least-privilege), `migrations.md`
  (§R12.6 Alembic/expand-contract/CONCURRENTLY), `procedure.md` (§R12.15 воспроизводимый деплой нового
  сервера).
- **Критерий:** матрица окружений полна; процедура пошагова; реальный деплой/миграции — RV-1/RV-4.

### T20.7 — Security Documentation (req 7)
- `docs/security/security-model.md` (обзор), `secrets.md` (§R12.2), `rbac.md` (§R10.5), `isolation.md`
  (§R2.6 channel isolation), `mtproto.md` (§R12.14 при введении, ADR-001); корневой `SECURITY.md`
  (disclosure policy — детерминированный шаблон).
- **Критерий:** покрыты секреты/RBAC/изоляция/MTProto-гейтинг; согласовано с реализацией.

### T20.8 — Runbook Architecture (req 7)
- `docs/runbooks/README.md` (индекс/структура runbook) + per-scenario: `scheduler-down.md`, `database-down.md`,
  `backup-failure.md`, `mass-publish-errors.md`, `disk-full.md`, `dlq-requeue.md` (§R12.10 алерты, §R8 DLQ).
- **Критерий:** каждый runbook: симптом→диагностика→действие→эскалация; детерминирован; трассируется на алерты.

### T20.9 — Troubleshooting (req 7)
- `docs/troubleshooting/README.md` (частые проблемы/диагностика: конфиг, БД/Redis-подключение, provider-
  ключи→фейк, RUN_INTEGRATION).
- **Критерий:** покрывает известные наблюдения из TECHNICAL_BACKLOG (OR-*/RV-*).

### T20.10 — Release Engineering (req 8–16)
- `docs/release/README.md` (**Release Engineering** — отдельная подсистема doc, req 8), `versioning.md` (req 9,
  SemVer/тег-схема `stage-*`→`vX.Y.Z`), `release-checklist.md` (req 10, §R13.4), `deployment-checklist.md`
  (req 11), `production-readiness-checklist.md` (req 12), `upgrade-strategy.md` (req 14), `rollback-strategy.md`
  (req 15, §R12.6 expand-contract-откат), `packaging.md` (req 16, §R12.13 образ/uv-lock),
  `release-automation-seams.md` (req 20, точки автоматизации без реализации); корневой `CHANGELOG.md`
  (Keep-a-Changelog, детерминированный).
- **Критерий:** каждый пункт — отдельный файл; чек-листы детерминированы (плейсхолдеры); трассируются на
  §R12/§R13.4; реальный релиз — RV.

### T20.11 — Support Documentation (req 18)
- `docs/support/README.md` (**Support**: каналы поддержки, SLA-шаблон, эскалация, диагностический сбор
  §R12.15).
- **Критерий:** поддержка-процедуры полны и детерминированы.

### T20.12 — DevOps-артефакты (req 2, 20, 21) — §R12.12/§R12.13
- `.github/workflows/ci.yml` (**CI/CD-шаблон**: format→static→tests→build→migration-check→deploy; deploy
  gated/manual, не исполняется — RV), `Makefile` (dev-tooling: `lint`/`type`/`test`/`gate`), dependency-lock:
  документ `docs/deployment/dependency-lock.md` (§R12.13) + пометка, что реальный `uv.lock` — RV (нужен uv+сеть).
- **Критерий:** ci.yml валиден синтаксически (YAML), но не запускается; Makefile-цели соответствуют gate;
  `app/` не затрагивается; новых зависимостей не ставится.

### T20.13 — Итоговые карты и сводки (req 24–30)
- `docs/architecture/subsystem-map.md` (req 24), `docs/architecture/dependency-map.md` (req 25),
  `docs/architecture/requirements-matrix.md` (**итоговая матрица `R*` по этапам**, req 26, консолидация
  TRACEABILITY), `docs/architecture/adr-summary.md` (req 27), `docs/release/runtime-verification-pending.md`
  (**итоговый RV-1…RV-18**, req 28, из TECHNICAL_BACKLOG), `docs/release/production-readiness-summary.md`
  (req 29, §R13.4), `PROJECT_COMPLETION_SUMMARY.md` (req 30 — корневой финальный).
- **Критерий:** сводки консистентны с зафиксированными отчётами/backlog/traceability; RV-список полон
  (18 пунктов); матрица покрывает проверяемые `R*`; completion-summary охватывает Этапы 1–20.

### T20.14 — Consistency verification + gate
- Проверить: `git diff --name-only` **не** содержит `app/` (req 1–3); перекрёстные ссылки docs валидны;
  таблицы/матрицы согласованы; ruff/mypy/pytest без изменений (**466 passed / 6 skipped**).
- **Критерий:** `app/` не изменён; ссылки валидны; gate зелёный (без правок кода).

### T20.15 — Отчёты + живые доки + коммиты + тег
- `STAGE20_REPORT.md`, `CODE_AUDIT_STAGE20.md`, `RELEASE_NOTES_STAGE20.md`; финальное обновление
  `TECHNICAL_BACKLOG.md`/`TRACEABILITY_STAGE2.md`/`README.md`/`HANDOFF.md` (проект завершён).
- 3 коммита `docs(stage-20): …` (все изменения — документационные) + тег `stage-20-docs` (+ опц. `v1.0.0`
  по решению владельца). **СТОП на приёмку.**
- **Критерий:** все гейты зелёные; отчёты с тремя статусами; коммиты только docs; тег создан.

---

## Создаваемые файлы (сводно)

**`docs/` дерево:** `README.md`, `TAXONOMY.md`; `architecture/{overview,subsystem-map,dependency-map,
data-model,pipeline,adr-summary,requirements-matrix}.md`; `api/{rest-reference,errors,rbac,pagination}.md`;
`developer/{getting-started,coding-standards,testing-guide,extension-points}.md`; `operations/{monitoring,
logging,maintenance,disaster-recovery}.md`; `deployment/{docker,environment-matrix,configuration,secrets,
migrations,procedure,dependency-lock}.md`; `security/{security-model,secrets,rbac,isolation,mtproto}.md`;
`runbooks/{README,scheduler-down,database-down,backup-failure,mass-publish-errors,disk-full,dlq-requeue}.md`;
`troubleshooting/README.md`; `release/{README,versioning,release-checklist,deployment-checklist,
production-readiness-checklist,upgrade-strategy,rollback-strategy,packaging,release-automation-seams,
runtime-verification-pending,production-readiness-summary}.md`; `support/README.md`.
**Корневые артефакты:** `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `Makefile`,
`PROJECT_COMPLETION_SUMMARY.md`, `.github/workflows/ci.yml`.
**Доки этапа:** `STAGE20_REPORT.md`, `CODE_AUDIT_STAGE20.md`, `RELEASE_NOTES_STAGE20.md`; апдейт
`TECHNICAL_BACKLOG.md`/`TRACEABILITY_STAGE2.md`/`README.md`/`HANDOFF.md`. **`app/` — НЕ изменяется.**

## Требования MASTER_SPEC, реализуемые на Этапе 20

- **§R12.15** — воспроизводимый деплой (документация процедуры) — *Implemented (docs)*; реальный деплой — RV.
- **§R12.13** — фиксация зависимостей (`uv.lock`) — *Implemented (процедура/артефакт)*; реальный lock — RV.
- **§R12.12** — CI/CD (шаблон) — *Implemented (template)*; реальный прогон/деплой — RV.
- **§R12.7/§R12.8** — backup/restore (документация/runbooks) — *Implemented (docs)*; реальные — RV.
- **§R12.9/§R12.10** — logging/monitoring/alerting (документация) — *Implemented (docs)*; реальные — RV.
- **§R12.6** — migrations (документация expand-contract) — *Implemented (docs)*; реальный upgrade — RV.
- **§R13.4** — release-критерии (чек-листы, traceability, «документация актуальна») — *Statically Verified*.
- **§R13.5** — финальная цель (narrative в completion-summary) — *Implemented (docs)*.
- **§R3.1/§R3.8** — итоговая архитектурная документация/карты — *Statically Verified*.
- **Вне объёма / RV:** реальный CI/деплой/публикация/backup/restore/rollback/uv.lock/production-review.

## Риски

| # | Риск | Митигируется |
|---|---|---|
| R1 | Правки просачиваются в `app/` | guard `git diff` без `app/`; коммиты только docs (req 1–3) |
| R2 | Дрейф документации от SoT | docs ссылаются на MASTER_SPEC/спеки, не переписывают истину |
| R3 | Недетерминизм шаблонов (даты/хеши) | плейсхолдеры `<VERSION>`/`<DATE>` (req 22) |
| R4 | CI/uv.lock воспринимаются как исполненные | явные RV-пометки; ci.yml не запускается; deploy gated (req 20/21) |
| R5 | Несогласованность итоговых карт с отчётами | консолидация из зафиксированных STAGE*/TRACEABILITY/backlog |
| R6 | Изменение публичных Protocol/зависимостей | запрещено (req 4/5); ничего в `app/`/`pyproject` deps не меняется |

---

## Финальные публичные контракты проекта

Сводный реестр **Stable Public Contract** по Этапам 1–20 (детальные списки — в соответствующих
`STAGE<N>_REPORT.md §Публичные контракты`; здесь — карта верхнего уровня):
- **Инфраструктура (1–11):** `Settings`/config-first (§Appendix B) · ORM-модели (25 таблиц) + репозитории ·
  Redis (`RedisManager`/`KeyBuilder`/`RateLimiter`/`DistributedLock`/`Pub-Sub`) · Task Queue
  (`HandlerRegistry`/`Producer`/`Executor`/retry/backoff) · Scheduler (timing/advisory/materializer) · API
  (factory/lifespan/DI/errors/pagination/health) · Provider Layer (`Provider`/`get_*_provider` + per-kind
  Protocol'ы: LLM/Embedding/Image/Telegram + фейки).
- **Движки/подсистемы (12–18):** AI Engine (`AIEngine`/pipeline/selection/fallback + `OutputValidator`) ·
  Memory/RAG (storage-agnostic kernel + Knowledge + Memory) · Validation (`ValidationEngine`/rules/gates/
  decision) · Image Engine (`ImageEngine`/aspect/size/safety/postprocess/regen) · Telegram Engine
  (`TelegramEngine`/router/registry/handlers/publishing, no aiogram) · Analytics (event/metrics/audit/
  tracing/export-seam'ы) · Admin (`AdminApi`/authn⟂authz⟂RBAC/sessions/CSRF/management/dashboards).
- **Test Infrastructure (19):** `SeedManager`/factories/fixtures/9 стратегий/reporting/coverage/seams
  (вне `app/`).
- **Этап 20:** новых **кодовых** контрактов не вводит (только документация); фиксирует и публикует полный
  реестр как `docs/architecture/subsystem-map.md`.

## Финальная матрица зависимостей

- **Отсутствие циклических зависимостей:** ✅ — подтверждается `tests/test_layering.py` + per-subsystem
  independence-тестами (analytics/admin/framework); Этап 20 кода не добавляет.
- **Соблюдение layering guard:** ✅ — `app/` не изменяется; guard остаётся зелёным.
- **Независимость всех доменных подсистем:** ✅ — content/validators/images/telegram/memory/rag/analytics/
  admin не импортируют друг друга (взаимодействие — через публичные Protocol в composition); подтверждено
  grep + guard-тестами Этапов 12–19.
- **Отсутствие архитектурных нарушений:** ✅ — Architecture Freeze соблюдён на всех этапах; новых ADR нет;
  Этап 20 — только документация.
- Итоговая карта — `docs/architecture/dependency-map.md` (консолидация STAGE*-матриц).

## Финальная архитектурная проверка (план)

- **Соответствие MASTER_SPEC:** §R12.6–R12.15 (DevOps/документация), §R13.4/§R13.5 (release/финальная цель),
  §R3.1/§R3.8; документация трассируется на все проверяемые `R*` (`requirements-matrix.md`).
- **Соответствие §R3.1, §R3.8:** документация отражает слои/расширяемость; сама вне `app/`, слои не нарушает.
- **Итоговое влияние каждого этапа на архитектуру:** сводка в `subsystem-map.md`/`adr-summary.md` — каждый
  этап добавлял независимую подсистему/слой поверх паттерна «Protocol + фейки → RV», **нулевое** влияние на
  ранее замороженную архитектуру; Этап 20 — **нулевое** влияние (только docs).
- **Подтверждение сохранения Architecture Freeze:** ✅ — ни один этап не менял замороженную архитектуру без
  ADR; Этап 20 не меняет `app/`/Protocol/зависимости.
- **Итоговые архитектурные риски:** все открытые пункты — **Runtime Verification Pending (RV-1…RV-18)**
  (живые сервисы/инструменты/CI/деплой); архитектурных долгов нет.
- **Критерии готовности к Production Readiness Review:** (1) все реализованные `R*` — Implemented+Statically
  Verified; (2) gate зелёный (ruff/mypy-strict 0 `type:ignore`/pytest 466 passed); (3) traceability покрывает
  проверяемые `R*`; (4) документация/чек-листы/runbooks полны; (5) остаётся закрыть RV-1…RV-18 на живой
  инфраструктуре (Docker/PG/Redis/внешние API/CI) — это и есть предмет Production Readiness Review.

---

## Что НЕ делается на Этапе 20 (явные границы)

Реальные деплои/публикация пакетов/релизы, реальный запуск CI/CD, реальная генерация `uv.lock`, реальные
backup/restore/rollback/миграции на живой инфраструктуре, production-readiness review на живом стенде, а
также **любые изменения `app/`**, публичных Protocol, архитектурных зависимостей, бизнес-логики и состава
зависимостей. Всё исполнение — **RV-1…RV-18** (Production Readiness Review).

**После подготовки этого файла — СТОП. К реализации Этапа 20 не приступать без явного утверждения владельца.**
