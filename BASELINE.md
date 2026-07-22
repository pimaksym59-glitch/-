# BASELINE.md — Зафиксированный базис проекта

**Дата фиксации:** 2026-07-22 · **После:** Этап 1 (Repository Structure), принят владельцем.

---

## 🔒 ARCHITECTURE FREEZE — АКТИВЕН

Архитектура заморожена. **Любое изменение архитектуры допускается только через новый ADR** в
`docs/adr/` (§R0.4). Изменения кода в рамках уже зафиксированных решений — допустимы по этапам
§R13.1. Открытые архитектурные решения — ADR-001 (MTProto), ADR-002 (deploy), оба `Proposed`.

Источник истины требований: **`MASTER_SPEC.md` v2.0**. Иерархия: MASTER_SPEC →
DATABASE/API/TEST_SPEC → `docs/adr` → `docs/spec` (историч.) → код.

---

## Git

| Поле | Значение |
|---|---|
| Ветка | `master` |
| Baseline commit | `3325d0a3a9fc999bec233903608d2ae39732a891` (`3325d0a` — «Initial commit: AI Telegram automation platform») |
| Состояние рабочего дерева | **Этап 1 не закоммичен** — весь новый `app/`, документы и архивация `legacy/` находятся в рабочем дереве поверх `3325d0a` |

> ⚠️ Baseline-commit отражает **прежний** initial commit; результаты Этапа 1 пока в working tree.
> Чтобы сделать базис неизменяемым, требуется коммит Этапа 1 — **выполняется только по отдельной
> команде** (не коммичу без запроса).

## Runtime

| Компонент | Версия |
|---|---|
| Python (venv `.venv`) | **3.14.6** |
| Заявленный floor проекта (§R1.3) | `>=3.13` |

> Расхождение осознано: venv 3.14 удовлетворяет floor 3.13+, но 3.14 — bleeding-edge (наблюдение A,
> `CODE_AUDIT_STAGE1.md`): совместимость `asyncpg/pgvector/aiogram` проверяется на этапах 2–4.

## Dev-инструменты (фактические версии)

| Инструмент | Версия | Роль |
|---|---|---|
| ruff | 0.15.22 | формат + линтер |
| mypy | 2.3.0 | типизация (strict) |
| pytest | 9.1.1 | тесты |
| pytest-asyncio | 1.4.0 | async-тесты (объявлен, для будущих этапов) |
| pip | 26.1.2 | пакеты (поддерживает PEP 735 `--group`) |

Управление dev-зависимостями — через **PEP 735 `[dependency-groups]`** (`pip install -e . --group dev`).

## Структура репозитория (корень)

```
app/            — исходный код (см. пакеты ниже)
config/         — app-конфиг + channels/ (seed) [Stage 2]
docker/         — [Stage 3]      scripts/  storage/images/  logs/
tests/          — тесты (зеркалят app/)
docs/spec/      — историч. черновики (superseded)   docs/adr/ — ADR
legacy/         — архив прежнего билда (см. ниже)
pyproject.toml  .gitignore  README.md
MASTER_SPEC.md  DATABASE_SPEC.md  API_SPEC.md  TEST_PLAN.md
REPORT.md  DOCUMENT_AUDIT_V2.md  READY_FOR_IMPLEMENTATION.md
POC_IDENTITY.md  STAGE1_REPORT.md  CODE_AUDIT_STAGE1.md  BASELINE.md
```

## Пакеты `app/` (23 пакета: root + 22 субпакета)

| Слой (§R3.1) | Пакеты |
|---|---|
| root | `app` |
| presentation | `api`, `api.v1`, `middleware` |
| application | `services` |
| domain | `content`, `images`, `images.providers`, `llm`, `telegram`, `memory`, `rag`, `validators`, `analytics`, `notifications` |
| data | `repositories` |
| infra/shared | `models`, `db`, `schemas`, `core`, `scheduler`, `workers`, `utils` |

Каждый — с layered-docstring; маркер `app/py.typed` (PEP 561).

## Состояние `legacy/` (архив прежнего билда, обратимо)

Перемещено (не удалено): `src/`, `tests/`, `migrations/`, `docker/`, `.github/`, `alembic.ini`,
`Dockerfile`, `docker-compose.yml`, `pyproject.toml.old`, `README.old.md`, `.env.example.old`.
Исключено из тулинга (`ruff extend-exclude`); mypy/pytest его не видят.

## Снимок верификации (на момент фиксации)

| Проверка | Результат |
|---|---|
| `ruff format --check .` | 26 files already formatted |
| `ruff check .` | All checks passed |
| `mypy` (strict) | Success: no issues in 26 files |
| `pytest -q` | 4 passed |
| `pip install -e . --no-deps` | OK (`telegram-ai-platform 0.1.0`) |
| `pip install --group dev --dry-run` | resolves (PEP 735 OK) |

## Аудит `pyproject.toml`

Проведён и применён (детали и правки — в `CODE_AUDIT_STAGE1.md` §10). Итоговый манифест: 14
runtime-зависимостей стека §R1.3, dev-группа через PEP 735, без `[project.optional-dependencies]`.
