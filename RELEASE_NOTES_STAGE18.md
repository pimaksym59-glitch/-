# RELEASE NOTES — Stage 18 (Admin Panel & Control Center)

**Project:** AI Telegram Automation Platform · **Version:** 0.1.0 · **Date:** 2026-07-27
**Architecture Freeze:** ACTIVE · **SoT:** `MASTER_SPEC.md` v2.0

---

## Что сделано

**Независимая доменная подсистема Admin** в `app/admin` (§R10) — серверная логика панели управления и
**UI-agnostic Admin API**. Домен ничего не импортирует из FastAPI/Starlette и из других подсистем (движки/
Analytics/Memory/RAG/Workers/Providers-impl); взаимодействие только через публичные Protocol.

- **Authentication ⟂ Authorization ⟂ RBAC:** отдельные модули — `PasswordAuthenticator` (через
  `PasswordHasher`/`MfaVerifier` порты, секрет write-only §R10.4); `RbacAuthorization` (решения только по
  RBAC); **immutable RBAC-модель** `Role`/`Permission`/матрица (5 ролей, backend §R10.5, без строковых
  литералов).
- **Session ⟂ CSRF:** `SessionManager` (create/validate/**revoke_all** §R10.4, TTL по `Clock`, login-journal)
  + `Session` immutable; отдельная `CsrfStrategy` (`DoubleSubmitCsrf`/`SynchronizerTokenCsrf`).
- **Независимые management-сервисы:** User/Channel/Prompt(версии §R10.6)/Provider/Configuration(версии
  §R10.8) — каждый самостоятелен (без god-object, req 8), RBAC-gated, секреты **маскируются** в DTO-mapping.
- **Dashboards через порты:** Health (без бизнес-логики), Metrics, Analytics (**gated-awareness** §R10.3),
  Jobs (§R4.11; requeue = `TaskIntent` через очередь §R10.1), Error Reporting (§R12.9).
- **Feature Flags** (отдельный компонент + rollout-seam), **Pagination/Filtering/Search** (независимы),
  **DTO Mapping** (отдельный слой + обязательное маскирование), **Metrics/Logging — только hooks**.
- **AI Studio** изолирован (§R10.9): только dry-run/compare, **нет** портов записи памяти/публикации.
- **Admin API** — тонкий **delegation-фасад** `AdminApi` без бизнес-логики (req 2/8).
- **Composition** — `app/services/admin.py`: `build_admin_api` + адаптеры к **публичным** интерфейсам
  Analytics (`AuditPipeline`/`MetricsSnapshot`).

Toolchain зелёный: ruff, mypy-strict (351 файл, **0 `type: ignore`**), **pytest 422 passed / 6 skipped**;
подсистема покрыта на **~99%**.

## ⚠️ Ограничение верификации (нет реального Web UI/БД/браузера)

Реальный **Web UI (HTMX/HTTP)**/браузер, cookie-сессия/CSRF по проводу, реальный **хэшер паролей/MFA/внешние
SSO (OAuth/OIDC/LDAP/SAML)**, персистентность в PostgreSQL, действия панели через очередь, живые Analytics/
Providers/AI-Studio-прогоны — **вне объёма Этапа 18**, отмечены **Runtime Verification Pending (RV-17)**.
Новых зависимостей нет (Web/SSO SDK не устанавливаются и не импортируются).

## Архитектурные инварианты (подтверждено)
- Admin не зависит от реализации AI/Validation/Image/Telegram/Analytics (grep: не импортирует их, memory/rag/
  workers/providers, fastapi/starlette; они не импортируют admin).
- Взаимодействие только через публичные Protocol; Web UI/SSO — seam'ы; reuse Analytics — адаптерами в
  композиции. Новых циклов нет; layering guard зелёный (+`tests/admin/test_independence.py`).

## Следующий этап
**Этап 19 — Tests** (§R13.1 шаг 19, §R13.2): сквозные/интеграционные E2E-сценарии. Начинается **только по
отдельной команде**.
