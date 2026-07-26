# TASK_BREAKDOWN — Stage 18 (Admin Panel & Control Center)

**Требует утверждения перед реализацией. К реализации не приступать без явного разрешения владельца.**

Цель (§R13.1 шаг 18, §R10): **независимая доменная подсистема Admin** — **UI-agnostic Admin API** и вся
серверная логика панели управления: Authentication, Authorization (отдельно от Authentication), **RBAC**
(5 ролей, backend), Session Management, CSRF Strategy, Audit/Analytics Integration (через публичные
интерфейсы), независимые management-сервисы (User/Channel/Prompt/Provider/Configuration), Feature Flags,
Health Dashboard, Job Monitoring, Metrics Dashboard, Error Reporting, независимые Pagination/Filtering/
Search, отдельный слой DTO Mapping, Metrics/Logging — только hooks. **Никакого реального HTTP UI/браузера,
никакой конкретной UI-привязки, только публичные Protocol; домен независим и не импортирует другие
подсистемы.** Web UI (HTMX/HTTP) и внешние SSO — **точки расширения без реализации**. Architecture Freeze
ACTIVE; SoT — MASTER_SPEC.

## Границы объёма (важно)

Этап 18 — **серверная доменная логика панели + UI-agnostic Admin API** (Protocol'ы + DTO + сервисы-
решения), а НЕ веб-фронтенд. **Вне объёма Этапа 18** (Web UI seam / RV-17): реальные FastAPI/HTMX-роуты и
шаблоны, браузерные сценарии, реальная cookie-сессия/CSRF «по проводу», реальный хэшер паролей/MFA/SSO,
персистентность (`users`/`audit_log`/`config_versions`/`prompts`/… → PostgreSQL, наследует RV-9), реальные
действия панели через очередь (наследует RV-7), живые Analytics/Providers/AI-Studio (наследует RV-11/RV-16).
§R10.1 «панель = клиент services/api через очередь» реализуется как **интенты/порты** (действие →
task-intent), фактическая постановка в очередь — композиция/RV.

## Размещение (по §R3.1)

Доменный пакет **`app/admin/`** (новый; сейчас отсутствует — будет добавлен в `DOMAIN_PACKAGES` guard'а).
Домен **не открывает БД/HTTP**, **не импортирует FastAPI** и **не импортирует другие подсистемы**
(`app/content`, `app/validators`, `app/images`, `app/telegram`, `app/memory`, `app/rag`, `app/analytics`,
`app/core/providers`, `app/workers`, `app/api`, `app/services`, `app/db`, `app/repositories`, `app/models`,
`sqlalchemy`) — по образцу Analytics (Этап 17). Все внешние зависимости — через **порты-Protocol**,
инъектируемые в композиции. **Composition — `app/services/admin.py`**: адаптеры к публичным интерфейсам
Analytics (Audit/Metrics), Workers (job status), Provider Layer, Health, а также к реальным store'ам
(репозитории) и очереди — реальные бэкенды RV-17. Параллельная подсистема, независимая от всех движков.

**Ключевое решение по независимости vs. §R10 «панель = клиент services»:** админ-домен зависит только от
**собственных портов**; «использование Analytics/Audit/Workers только через публичные Protocol» (треб.
9/10/14/15) обеспечивается **адаптерами в композиции**, которые вызывают публичные интерфейсы этих
подсистем. Домен при этом не импортирует их напрямую → «полностью независимая подсистема» (треб. 1)
сохраняется. Это тот же паттерн, что и в Этапах 12–17.

---

## ⚠️ Ограничение среды (нет реального Web UI/БД/браузера)

По требованию — не имитировать runtime и не выполнять HTTP UI/браузерные сценарии. **Три статуса (треб.
24):**
- **Implemented / Statically Verified (offline):** вся серверная логика offline на детерминированных
  фейках (FakeClock/FakePasswordHasher/FakeTokenFactory/Fake*Store/FakeAuditPort/FakeAnalyticsRead/
  FakeJobMonitor/FakeMetricsRead/FakeHealthRead) — authentication, authorization, RBAC, sessions, CSRF,
  management-сервисы, feature flags, dashboards (health/metrics/analytics/jobs/errors), pagination/
  filtering/search, DTO mapping, hooks, Admin API facade. Покрытие подсистемы ~100%.
- **Runtime Verification Pending (RV-17):** реальный **Web UI (HTMX/HTTP)** и браузерные сценарии, реальная
  cookie-сессия/CSRF по проводу, реальный **хэшер паролей/MFA/внешние SSO**, персистентность в PostgreSQL
  (наследует RV-9), реальные действия панели через очередь (наследует RV-7), живые Analytics/Providers/
  AI-Studio (наследует RV-11/RV-16). Интеграционные тесты — `skipif` (`RUN_INTEGRATION=1`).

## Особые требования владельца (1–24) — карта на реализацию

1 независимая доменная подсистема → пакет `app/admin/`, без импортов других подсистем, grep-guard ·
2 Admin API не зависит от UI → Admin API = сервис-фасад + Protocol'ы + DTO (не FastAPI); Web UI — seam ·
3 интеграции только через публичные Protocol → все внешние зависимости — порты · 4 Authentication —
отдельный модуль → `authentication.py` · 5 Authorization отдельно от Authentication → `authorization.py` ·
6 RBAC — отдельная модель → `rbac.py` (Role/Permission/матрица) · 7 Session Management — отдельный модуль →
`sessions.py` · 8 CSRF — отдельная стратегия → `csrf.py` (`CsrfStrategy` Protocol) · 9 Audit — только через
публичные интерфейсы Analytics → `AuditPort`, адаптер к `AuditPipeline` в композиции · 10 Analytics —
только через публичные Protocol → `AnalyticsReadPort`/`MetricsReadPort`, адаптеры в композиции ·
11 User/Channel/Prompt/Provider/Configuration Management — независимые сервисы → 5 модулей + свои
store-порты · 12 Feature Flags — отдельный компонент → `feature_flags.py` · 13 Health Dashboard без
бизнес-логики → `health_dashboard.py` (только shaping через `HealthReadPort`) · 14 Job Monitoring через
публичные интерфейсы Workers → `JobMonitorPort`, адаптер к статусам очереди · 15 Metrics Dashboard только
через публичный Protocol → `MetricsReadPort` (адаптер к Analytics MetricsSnapshot) · 16 Pagination/
Filtering/Search — независимые компоненты → 3 модуля · 17 DTO Mapping — отдельный слой → `mapping.py` ·
18 Metrics/Logging — только hooks → `observability.py` · 19 Web UI — seam без реализации → `seams.py`
(`WebUiRenderer`) · 20 внешние SSO — seam без реализации → `SsoProvider` seam · 21 без реального HTTP UI/
браузера → только фейки/порты · 22 фейки детерминированы → без random/времени (инъекция Clock/TokenFactory)
· 23 публичные интерфейсы — Protocol · 24 три статуса — раздел выше + отчёты.

## Ключевые архитектурные развязки

- **Authentication ⟂ Authorization ⟂ RBAC (треб. 4/5/6):** `authentication.py` проверяет **кто ты**
  (credentials→`AuthOutcome` через `PasswordHasher`/`MfaVerifier` порты); `rbac.py` — **модель** ролей и
  прав (Role/Permission/матрица, зеркалит §R10.5 и RBAC-матрицу API_SPEC); `authorization.py` — **решение**
  `authorize(actor, permission)→Decision` поверх RBAC. Три отдельных модуля, никакого смешения.
- **RBAC — backend (§R10.5):** решения принимаются в домене/сервисах, не в UI. `owner/admin/editor/analyst/
  viewer` + права по областям (Channels/Personas/Content/Scheduler/Analytics/Users/Audit) из RBAC-матрицы.
- **Секреты — write-only (§R10.4):** пароли/ключи принимаются (через хэшер-порт/write-only DTO-поля), но
  **никогда не возвращаются** в view-DTO (маскирование в `mapping.py`).
- **Audit/Analytics/Workers/Health — только порты (треб. 9/10/14/15):** домен объявляет `AuditPort`/
  `AnalyticsReadPort`/`MetricsReadPort`/`JobMonitorPort`/`HealthReadPort`/`ErrorReportPort`; композиция
  адаптирует их к **публичным** интерфейсам Analytics (`AuditPipeline`/`AuditEvent`/`MetricsSnapshot`),
  Workers (статусы задач §R4.11) и `HealthService`.
- **§R10.1 действия через очередь:** «опубликовать/перегенерировать/requeue» — это **task-intent** (DTO
  намерения) через `QueuePort`; второй путь публикации запрещён; фактическая постановка — композиция/RV-17.
- **§R10.9 AI Studio изолирован:** `ai_studio.py` — изолированный сервис (dry-run/сравнение/оценка
  стоимости) **структурно не имеющий** доступа к записи памяти/публикации (зависит только от read/dry-run
  портов); живой прогон — RV.
- **Детерминизм (треб. 22):** нет `random`/`time.time()`/`datetime.now()` в домене — время через `Clock`,
  токены/идентификаторы через `TokenFactory`/`IdFactory` порты; фейки воспроизводимы.

---

## Последовательность задач

### T18.0 — Зависимости + gate + layering guard
- **Новых зависимостей нет** (фейки/порты). Web UI/SSO SDK — только seam'ы (не ставятся, RV-17).
- Добавить `"admin"` в `DOMAIN_PACKAGES` (`tests/test_layering.py`).
- **Критерий:** нет новых пакетов; guard распознаёт `admin` как домен; в `app/admin/` нет импортов
  запрещённых пакетов (grep); при нужде в зависимости — СТОП + отчёт.

### T18.1 — Ports + shared types
- `app/admin/ports.py` — фундаментальные порты `Clock`/`IdFactory`/`TokenFactory` + интеграционные порты
  `AuditPort`/`AnalyticsReadPort`/`MetricsReadPort`/`JobMonitorPort`/`HealthReadPort`/`ErrorReportPort`/
  `QueuePort` (все Protocol, DTO — под `TYPE_CHECKING`). `app/admin/types.py` — общие immutable DTO
  (`AdminActor`, `ActionResult`, `WriteOnly[T]` маркер).
- **Критерий:** все порты — Protocol; типы immutable; модуль без запрещённых импортов; unit по типам.

### T18.2 — RBAC model (треб. 6)
- `app/admin/rbac.py` — `Role` StrEnum (`owner/admin/editor/analyst/viewer`), `Permission` StrEnum
  (области §R10.6/RBAC-матрицы), `PermissionMatrix` (декларативное отображение роль→права, read-only),
  `has_permission(role, permission)`.
- **Критерий:** матрица соответствует API_SPEC §R10.5 (owner полный; viewer read-only; analyst — analytics/
  audit-read); типизировано; unit на каждую строку матрицы.

### T18.3 — Authentication (треб. 4) + SSO seam (треб. 20)
- `app/admin/authentication.py` — `Credentials` DTO (write-only secret), `AuthOutcome`, `PasswordHasher`/
  `MfaVerifier` порты, `PasswordAuthenticator` (проверка через хэшер-порт; MFA опц.), `SsoProvider` **seam**
  (без реализации, `NotImplementedError`, RV-17). **Не** содержит authorization/RBAC.
- **Критерий:** authn отделён от authz/RBAC; секрет не логируется/не возвращается; SSO — seam; unit
  (успех/неуспех/mfa/seam raises).

### T18.4 — Authorization (треб. 5)
- `app/admin/authorization.py` — `AuthorizationPolicy` + `authorize(actor: AdminActor, permission) →
  AuthorizationDecision` (allow/deny + причина) поверх `rbac`; `require(actor, permission)` (raise
  `PermissionDenied`). Чистые решения; **не** аутентифицирует.
- **Критерий:** решение только по RBAC-модели; deny по умолчанию для неизвестных прав; unit (allow/deny/
  raise).

### T18.5 — Session Management (треб. 7)
- `app/admin/sessions.py` — immutable `Session` (id/user/role/created_at/expires_at), `SessionStore` порт,
  `SessionManager` (create/validate/revoke/revoke_all — принудительное завершение §R10.4; TTL через
  `Clock`), `LoginJournalPort` (журнал входов §R10.4). Без cookie/HTTP (это Web UI seam).
- **Критерий:** сессии через порт-store; истечение по Clock; forced-revoke; журнал через порт; unit.

### T18.6 — CSRF Strategy (треб. 8)
- `app/admin/csrf.py` — `CsrfStrategy` Protocol + `DoubleSubmitCsrf`/`SynchronizerTokenCsrf` (токен через
  `TokenFactory`, проверка `issue`/`validate`, детерминированно). Решение-только; привязка к HTTP — seam.
- **Критерий:** Protocol + ≥2 стратегии; детерминизм; unit (issue/validate/mismatch).

### T18.7 — Pagination / Filtering / Search (треб. 16)
- `app/admin/pagination.py` — `PageRequest`/`Page[T]` (независимо от `app/schemas`); `app/admin/filtering.py`
  — `Filter`/`FilterSet` (декларативно) + `apply`; `app/admin/search.py` — `SearchQuery` + `SearchStrategy`
  Protocol + `SubstringSearch`/`TokenSearch` (детерминированно).
- **Критерий:** три независимых компонента; generic-типизация; детерминизм; unit на каждый.

### T18.8 — DTO Mapping (треб. 17)
- `app/admin/mapping.py` — отдельный слой: `to_user_view`/`to_channel_view`/`to_prompt_view`/… — маппинг
  store-записей → view-DTO с **маскированием секретов** (§R10.4 write-only не отображается).
- **Критерий:** секреты не попадают в view-DTO; маппинг детерминирован; unit (маскирование).

### T18.9 — Audit Integration (треб. 9) — §R10.8
- `app/admin/audit.py` — `AuditPort` (порт админа) + `AdminAuditRecorder` (формирует запись действия
  actor/action/entity/before/after → `AuditPort.record`). Композиция адаптирует к публичному
  `AuditPipeline`/`AuditEvent` Analytics.
- **Критерий:** аудит только через порт; before/after immutable; unit (record → port).

### T18.10 — Analytics + Metrics Dashboard Integration (треб. 10/15) — §R10.3
- `app/admin/analytics_view.py` — `AnalyticsReadPort` + `AnalyticsDashboard` shaping (пометка **gated**
  метрик §R10.3 — недоступные скрыты/помечены, не выдуманы). `app/admin/metrics_dashboard.py` —
  `MetricsReadPort` + `MetricsDashboard` shaping (адаптер к Analytics `MetricsSnapshot` — в композиции).
- **Критерий:** только через порты; gated-awareness; unit (доступное/gated).

### T18.11 — Job Monitoring (треб. 14) — §R4.11
- `app/admin/jobs.py` — `JobMonitorPort` + `JobMonitorService` (список задач/статусы §R4.11, DLQ requeue как
  **интент** через `QueuePort`). Только через публичные интерфейсы Workers (адаптер в композиции).
- **Критерий:** статусы через порт; requeue = интент (не прямой доступ к очереди); unit.

### T18.12 — Health Dashboard (треб. 13)
- `app/admin/health_dashboard.py` — `HealthReadPort` + `HealthDashboard` — **только shaping** результатов
  проб (без бизнес-логики). Адаптер к `HealthService` — в композиции.
- **Критерий:** нет бизнес-логики (только преобразование); unit (healthy/degraded shaping).

### T18.13 — Error Reporting — §R12.9
- `app/admin/errors.py` — `ErrorReportPort` + `ErrorReportService` (чтение/пагинация/фильтр error-записей;
  read-only). Классы ошибок домена (`AdminError`/`PermissionDenied`/`NotFoundInAdmin`).
- **Критерий:** read-only; пагинация/фильтр через компоненты T18.7; unit.

### T18.14 — Feature Flags (треб. 12)
- `app/admin/feature_flags.py` — `FeatureFlag` DTO, `FeatureFlagStore` порт, `FeatureFlagService`
  (list/get/set/evaluate — детерминированно). Отдельный компонент.
- **Критерий:** evaluate детерминирован; toggle через порт; unit (on/off/unknown).

### T18.15 — Management services (треб. 11)
- `app/admin/users.py` (`UserStore` порт + `UserService`: list/create/update-role/deactivate; пароль через
  хэшер; §R10.4) · `app/admin/channels.py` (`ChannelStore` + `ChannelService`; §R2.6) · `app/admin/
  prompts.py` (`PromptStore` + `PromptService`; версионирование §R10.6) · `app/admin/providers.py`
  (`ProviderRegistryPort` + `ProviderService`: список/capabilities/health; ключи write-only) · `app/admin/
  configuration.py` (`ConfigStore` + `ConfigService`: чтение/обновление + `config_versions` snapshot/rollback
  §R10.8 — данные/решение, без реальной записи). Каждый — **независимый сервис**, все с RBAC-проверкой
  через `authorization`.
- **Критерий:** 5 независимых сервисов; write-only секреты; версионирование prompts/config; RBAC на каждой
  мутации; unit на сервис.

### T18.16 — AI Studio (изолированный, §R10.9)
- `app/admin/ai_studio.py` — `AiStudioService` (dry-run/сравнение/оценка стоимости) через **read/dry-run
  порты**; структурно **не имеет** доступа к записи памяти/публикации (изоляция §R10.9). Живой прогон — RV.
- **Критерий:** изоляция подтверждена (нет портов записи памяти/публикации); unit (dry-run через порт).

### T18.17 — Observability hooks (треб. 18)
- `app/admin/observability.py` — `AdminMetricsHook`/`AdminLoggingHook` Protocol + NoOp по умолчанию
  (локально, как в Validation/Analytics). Вызываются сервисами на действиях.
- **Критерий:** hooks-only; no-op по умолчанию; unit.

### T18.18 — Web UI + SSO extension seams (треб. 19/20)
- `app/admin/seams.py` — `WebUiRenderer` Protocol (HTMX/HTTP-рендер — **seam, без реализации**), `SsoProvider`
  seam (реэкспорт из authentication) — методы `raise NotImplementedError` (RV-17). Без FastAPI/HTTP-импортов.
- **Критерий:** seam'ы присутствуют, ничего не рендерят/не аутентифицируют; grep: нет fastapi/starlette;
  unit (seam raises).

### T18.19 — Admin API facade (треб. 2)
- `app/admin/service.py` — `AdminService` — **UI-agnostic** фасад: единая точка над area-сервисами +
  authentication/authorization/session/csrf/audit/dashboards. Возвращает DTO; не знает про HTTP.
- **Критерий:** фасад собирается из независимых компонентов через порты; RBAC применяется централизованно;
  unit-композиция.

### T18.20 — Fakes (треб. 22)
- `app/admin/fakes.py` — детерминированные `FakeClock`/`FakeTokenFactory`/`FakeIdFactory`/`FakePasswordHasher`
  (обратимая нешифрующая проверка для тестов)/`Fake*Store`/`FakeAuditPort`/`FakeAnalyticsRead`/
  `FakeMetricsRead`/`FakeJobMonitor`/`FakeHealthRead`/`FakeErrorReport`/`FakeQueuePort`. Без random/сети/
  времени.
- **Критерий:** все фейки детерминированы; ничего наружу не шлют; используются во всех unit.

### T18.21 — Composition root
- `app/services/admin.py` — `build_admin_service(...)`: сборка на фейках по умолчанию; **адаптеры** к
  публичным интерфейсам Analytics (Audit/Metrics), Workers (job status), Provider Layer, `HealthService`;
  реальные store'ы (репозитории)/очередь — точки для RV-17. Только здесь допускаются импорты
  `app/analytics`/`app/workers`/`app/core/providers`/`app/services/health`/`app/core.config`.
- **Критерий:** композиция строит рабочий offline-сервис; адаптеры покрыты; layering guard зелёный.

### T18.22 — Тесты + layering/independence
- `tests/admin/*` — по модулю (rbac/auth/authorization/sessions/csrf/pagination/filtering/search/mapping/
  audit/analytics_view/metrics_dashboard/jobs/health_dashboard/errors/feature_flags/users/channels/prompts/
  providers/configuration/ai_studio/observability/seams/service); `tests/services/test_admin.py` —
  композиция/адаптеры; `tests/admin/test_independence.py` — AST-guard независимости; обновить
  `tests/test_layering.py`. Все offline/детерминированы.
- **Критерий:** ~100% покрытие подсистемы; guard/independence зелёные; интеграционные (Web UI/БД/очередь) —
  `skipif`.

### T18.23 — Gate + отчёты + живые доки + коммиты + тег
- `ruff` (format+check), `mypy --strict` (0 ошибок, **0 `type: ignore`**), `pytest`.
- `STAGE18_REPORT.md`, `CODE_AUDIT_STAGE18.md`, `RELEASE_NOTES_STAGE18.md`; обновить `TECHNICAL_BACKLOG.md`
  (+RV-17), `TRACEABILITY_STAGE2.md` (блок Этапа 18), README-секцию.
- 3 коммита `feat/test/docs(stage-18):` + тег `stage-18-admin-panel`. **СТОП на приёмку.**
- **Критерий:** все гейты зелёные; отчёты с тремя статусами; 3 коммита + 1 тег; следующий этап не начат.

---

## Создаваемые файлы (сводно)

**Домен `app/admin/`:** `__init__.py`, `ports.py`, `types.py`, `rbac.py`, `authentication.py`,
`authorization.py`, `sessions.py`, `csrf.py`, `pagination.py`, `filtering.py`, `search.py`, `mapping.py`,
`audit.py`, `analytics_view.py`, `metrics_dashboard.py`, `jobs.py`, `health_dashboard.py`, `errors.py`,
`feature_flags.py`, `users.py`, `channels.py`, `prompts.py`, `providers.py`, `configuration.py`,
`ai_studio.py`, `observability.py`, `seams.py`, `service.py`, `fakes.py`.
**Композиция:** `app/services/admin.py`. **Тесты:** `tests/admin/test_*` + `tests/services/test_admin.py`
(+правка `tests/test_layering.py`). **Доки:** `STAGE18_REPORT.md`, `CODE_AUDIT_STAGE18.md`,
`RELEASE_NOTES_STAGE18.md`; апдейт `TECHNICAL_BACKLOG.md`, `TRACEABILITY_STAGE2.md`, `README.md`.

## Требования MASTER_SPEC, реализуемые на Этапе 18

- **§R10.1** — панель = клиент через очередь (действия как task-intent через `QueuePort`; постановка — RV) —
  *Implemented (интенты)*.
- **§R10.3** — аналитика показывает только доступное (gated-awareness метрик) — *Implemented*.
- **§R10.4** — auth/MFA(порт)/сессии/журнал входов/принудительное завершение; секреты write-only —
  *Implemented*; реальный хэшер/MFA/cookie — RV-17.
- **§R10.5** — 5 ролей, **RBAC на backend** (модель + решения) — *Implemented / Statically Verified*.
- **§R10.6** — разделы панели как management-сервисы/dashboards — *Implemented (Admin API)*; Web UI — RV-17.
- **§R10.7** — bulk уважает пер-бот лимиты (как интенты в очередь), soft delete — *Implemented (интенты)*.
- **§R10.8** — audit_log + config_versions (snapshot/rollback как данные/решение) — *Implemented*;
  персистентность — RV-17.
- **§R10.9** — AI Studio изолирован (structurally, без записи памяти/публикации) — *Implemented (seam)*;
  живой прогон — RV.
- **§R3.1 / §R3.8** — слои и расширяемость регистрацией/инъекцией — *Statically Verified*.
- **Частично / вне объёма:** реальный Web UI/HTTP/браузер, персистентность, очередь-исполнение, живые
  Analytics/Providers/AI-Studio — **RV-17**.

## Риски

| # | Риск | Митигируется |
|---|---|---|
| R1 | Соблазн импортировать другие подсистемы/FastAPI в домене | domain без внешних импортов, grep-guard + independence-тест (треб. 1–3) |
| R2 | §R10 «панель = клиент services» vs. независимость домена | порты в домене + адаптеры к публичным интерфейсам в композиции (задокументировано) |
| R3 | Смешение Authentication/Authorization/RBAC | три отдельных модуля, без взаимного смешения (треб. 4/5/6) |
| R4 | Утечка секретов в view-DTO | write-only маркеры + маскирование в `mapping.py` (§R10.4); тест на маскирование |
| R5 | RBAC-обход через UI-скрытие | решения в домене/сервисах, не в UI (§R10.5); тесты allow/deny |
| R6 | AI Studio пишет в память/публикует (§R10.9) | структурная изоляция (нет портов записи/публикации); инвариант-тест |
| R7 | Недетерминизм (random/time) — треб. 22 | только Clock/TokenFactory/IdFactory-порты; фейки воспроизводимы |
| R8 | Раздувание объёма (~29 модулей) | строгая декомпозиция ≤400 строк/модуль, общие порты в `ports.py` |
| R9 | Ложное впечатление о готовности Web UI/persist | три статуса + RV-17 во всех отчётах и seam'ах |

---

## Публичные контракты Этапа 18

**Protocol (Stable Public Contract):** `Clock` · `IdFactory` · `TokenFactory` · `PasswordHasher` ·
`MfaVerifier` · `Authenticator` · `AuthorizationPolicy` · `CsrfStrategy` · `SearchStrategy` ·
`SessionStore` · `LoginJournalPort` · `AuditPort` · `AnalyticsReadPort` · `MetricsReadPort` ·
`JobMonitorPort` · `HealthReadPort` · `ErrorReportPort` · `QueuePort` · `UserStore` · `ChannelStore` ·
`PromptStore` · `ProviderRegistryPort` · `ConfigStore` · `FeatureFlagStore` · `AdminMetricsHook` ·
`AdminLoggingHook`.

**dataclass / DTO (immutable — Stable Public Contract):** `AdminActor` · `Credentials` (write-only secret) ·
`AuthOutcome` · `AuthorizationDecision` · `Session` · `CsrfToken` · `PageRequest` · `Page[T]` · `Filter` ·
`FilterSet` · `SearchQuery` · `FeatureFlag` · `UserView` · `ChannelView` · `PromptView` · `ProviderView` ·
`ConfigView`/`ConfigVersionView` · `JobView` · `HealthView` · `AnalyticsView` · `MetricsView` ·
`ErrorView` · `TaskIntent` · `ActionResult`.

**Enum / Model (Stable Public Contract):** `Role` · `Permission` · `PermissionMatrix` (RBAC-модель).

**Registry (Stable Public Contract):** `FeatureFlagService`-реестр (или `FeatureFlagRegistry`), опц.
`ProviderRegistryPort`.

**Pipeline / сервисы (Stable Public Contract):** `PasswordAuthenticator` · `SessionManager` ·
`AdminAuditRecorder` · `AnalyticsDashboard` · `MetricsDashboard` · `JobMonitorService` · `HealthDashboard` ·
`ErrorReportService` · `FeatureFlagService` · `UserService` · `ChannelService` · `PromptService` ·
`ProviderService` · `ConfigService` · `AiStudioService` · `AdminService` (фасад).

**Стратегии (Stable Public Contract):** `DoubleSubmitCsrf` · `SynchronizerTokenCsrf` · `SubstringSearch` ·
`TokenSearch`.

**Точки расширения (Stable seam — реализация RV-17):** `WebUiRenderer` (HTMX/HTTP) · `SsoProvider`
(внешние SSO) · реальные store'ы/`QueuePort` (репозитории/очередь) · реальные `PasswordHasher`/`MfaVerifier`.

**Errors (Stable Public Contract):** `AdminError` · `PermissionDenied` · `NotFoundInAdmin`.

**Fakes (Internal Contract):** `FakeClock` · `FakeTokenFactory` · `FakeIdFactory` · `FakePasswordHasher` ·
`Fake*Store` (User/Channel/Prompt/Config/FeatureFlag/Session) · `FakeAuditPort` · `FakeAnalyticsRead` ·
`FakeMetricsRead` · `FakeJobMonitor` · `FakeHealthRead` · `FakeErrorReport` · `FakeQueuePort`.

---

## Матрица зависимостей

- **Новые входящие (кто импортирует `app/admin` [новое]):** `app/services/admin.py`, `tests/admin/*`,
  `tests/services/test_admin.py`. Доменные движки/подсистемы — **не импортируют**.
- **Новые исходящие (что импортирует `app/admin` [новое]):** **только stdlib** (`dataclasses`, `enum`,
  `typing`, `datetime`, `threading`, `collections.abc`). **НЕ импортирует** `app/content`, `app/validators`,
  `app/images`, `app/telegram`, `app/memory`, `app/rag`, `app/analytics`, `app/core/providers`,
  `app/workers`, `app/api`, `app/services`, `app/db`, `app/repositories`, `app/models`, `sqlalchemy`,
  `fastapi`, `starlette` (проверка grep + independence-тест).
- **`app/services/admin.py` исходящие:** `app/admin`, `app/analytics` (Audit/Metrics — публичные), `app/
  workers` (статусы), `app/core/providers` (реестр/health), `app/services/health`, `app/core.config`.
- **Циклы:** отсутствуют — `admin` ⊄ движки/подсистемы; те ⊄ `admin`; authn ⊄ authz ⊄ rbac (однонаправлено).
- **Layering guard:** `admin` = домен (после добавления в `DOMAIN_PACKAGES`); запрещённые (`app.api`/
  `app.services`/`app.repositories`/`app.db`/`fastapi`) не импортируются → `tests/test_layering.py` зелёный.

## Архитектурная проверка (план)

- **Соответствие MASTER_SPEC:** §R10.1–R10.9 (панель/очередь/gated-аналитика/auth/RBAC/разделы/bulk/audit/
  AI-Studio), §R3.1/§R3.8; RBAC-матрица из `API_SPEC.md`.
- **Соответствие §R3.1, §R3.8 и требованиям административной подсистемы:** §R3.1 — домен без БД/HTTP/UI,
  композиция в services; §R3.8 — сервисы/стратегии/флаги расширяемы регистрацией и инъекцией портов;
  независимость (треб. 1–3) — domain без внешних импортов.
- **Влияние на AI Engine:** **нулевое** — `app/content` не затрагивается (AI Studio — через read/dry-run
  порты, адаптер в композиции; живой прогон — RV).
- **Влияние на Validation Engine:** **нулевое** — `app/validators` не используется.
- **Влияние на Image Engine:** **нулевое** — `app/images` не используется.
- **Влияние на Telegram Engine:** **нулевое** — `app/telegram` не используется (действия — task-intent).
- **Влияние на Analytics:** **нулевое (на уровне домена)** — Audit/Metrics только через порты; адаптеры к
  публичным `AuditPipeline`/`MetricsSnapshot` — в композиции (Analytics не изменяется).
- **Влияние на Provider Layer:** **нулевое** — реестр/health через `ProviderRegistryPort` (адаптер в
  композиции); `app/core/providers` не изменяется.
- **Требуется ли изменение Architecture Freeze:** **нет** — новый доменный пакет `app/admin/` + добавление
  `admin` в guard-список доменов; существующий паттерн «порты + фейки → реальные адаптеры/UI позже (RV)»;
  новых ADR нет.
- **Потенциальные архитектурные риски:** (1) реальный Web UI/persist/queue/live-integrations — RV-17;
  (2) независимость домена — grep-guard + independence-тест; (3) секреты — write-only + маскирование;
  (4) объём — модульная декомпозиция ≤400 строк. Иных нет.

---

## Что НЕ делается на Этапе 18 (явные границы)

Реальные FastAPI/HTMX-роуты и шаблоны, браузерные сценарии, cookie-сессия/CSRF по проводу, реальный хэшер
паролей/MFA/внешние SSO, персистентность (PostgreSQL), реальные действия панели через очередь, живые
Analytics/Providers/AI-Studio-прогоны, изменения в других движках/подсистемах, новые зависимости. Всё это —
последующие стадии и **RV-17**.

**После подготовки этого файла — СТОП. К реализации Этапа 18 не приступать без явного утверждения владельца.**
