# RELEASE NOTES — Stage 1 (Repository Structure)

**Project:** AI Telegram Automation Platform · **Version:** 0.1.0 · **Date:** 2026-07-22
**Baseline:** commit `7aa02b0`, tag `stage-1-baseline` (immutable return point) · docs: `056579e`,
tag `stage-1-baseline-docs` · **Architecture Freeze: ACTIVE**

---

## Что сделано

- Зафиксирована документация-основа: `MASTER_SPEC.md` v2.0 (единственный источник требований, 145
  `R*`), реализационные `DATABASE_SPEC.md` / `API_SPEC.md` / `TEST_PLAN.md`, аудиты
  `REPORT.md` / `DOCUMENT_AUDIT_V2.md`, `READY_FOR_IMPLEMENTATION.md`.
- Прежний билд (`src/`-layout) **архивирован в `legacy/`** без потерь (git renames).
- Создан чистый скелет **`app/`** — 23 пакета по слоям (§R3.1), layered-docstrings, `py.typed`.
- `pyproject.toml`: манифест стека §R1.3 + toolchain (**ruff**, **mypy strict**, **pytest**);
  dev-зависимости через **PEP 735 `[dependency-groups]`**; `legacy/` исключён из тулинга.
- Тесты Этапа 1 (offline): проверка структуры пакетов + **AST-guard направления зависимостей**.
- Верификация зелёная: `ruff format/check` ✔ · `mypy --strict` (26 файлов) ✔ · `pytest` 4/4 ✔ ·
  editable build ✔.
- Baseline закоммичен и отмечен тегом; `STAGE1_FINAL.md` фиксирует точку возврата.

## Что НАМЕРЕННО НЕ реализовано (границы этапа)

Пакеты созданы пустыми (только docstring); функциональность — на своих этапах §R13.1:
конфиг-загрузчик и `.env.example` (2) · Docker/Compose (3) · БД/pgvector/Alembic (4) · Redis (5) ·
ORM-модели + UUIDv7-провайдер (6) · репозитории (7) · очередь+реестр (8) · scheduler (9) ·
эндпоинты API и `main.py` (10) · провайдер-абстракции/фейки (11) · движки AI/Memory/Validation/
Image/Telegram/Analytics (12–17) · Admin Panel (18). Никаких временных решений/техдолга.

## Архитектурные решения (заморожены, §R0.2)

- **Модульный монолит** + Postgres-очередь как backbone + воркеры ×N (не микросервисы).
- Строгие слои `api → services → (domain, repositories) → models/db`; циклы запрещены (guard в тестах).
- **Bot API/aiogram** как транспорт (MTProto — опциональный адаптер); планирование — своей очередью.
- Изоляция каналов hard-filter `WHERE channel_id`; provider-абстракции с фейками (offline-тесты).
- **pgvector** с платформенно-фиксированной размерностью эмбеддингов; **UUIDv7** PK; soft-delete +
  partial-unique; **persona (голос) ≠ actor (визуал)**; analytics — временной ряд.
- Полный перечень — 44 решения в `MASTER_SPEC.md` Appendix A.

## Принятые ADR

| ADR | Тема | Статус |
|---|---|---|
| ADR-001 | MTProto Stats Adapter (O-1) | **Proposed** — рекомендация: старт без адаптера, B1 после спайка; решение за владельцем |
| ADR-002 | Deployment Environment (O-2) | **Proposed** — рекомендация: старт VM+Compose+Caddy, рост → managed; решение за владельцем |

> Ни один ADR ещё не переведён в `Accepted` — оба фиксируют варианты и рекомендации; окончательный
> выбор делает владелец. Любое новое архитектурное изменение — только через новый ADR (Freeze).

## Открытые риски

| Риск | Уровень | Где решается |
|---|---|---|
| Постоянство лица актёра (T-3) — недостижимо текстом; гипотеза не проверена | 🔴 | POC до Этапа 15 (`POC_IDENTITY.md`) |
| Слабый сигнал самообучения без per-post метрик (Bot API) | 🟠 | ADR-001 / Этап 11 |
| Потолок масштаба — лимиты и стоимость внешних API, не CPU | 🟠 | rate-limiter (§R7.6/R8.9), cost dashboard |
| Python 3.14 (venv) vs стек и floor 3.13 — совместимость deps | 🟡 | проверка на Этапах 2–4; UUIDv7/версия — Этап 6, возможно ADR |
| `license` проекта не задан | 🟢 | на усмотрение владельца |

## Следующий этап

**Этап 2 — Configuration** (§R13.1 шаг 2): единый загрузчик Pydantic Settings (`app/core/config.py`),
`.env.example`, `config/*.yaml` (дефолты), приоритет БД(канал) > `.env` > `config.yaml` (§R3.4).
Начинается **только по отдельной команде**.

---

> Примечание: этот файл создан после docs-коммита `056579e` и в git пока не добавлен (отдельная
> команда не поступала).
