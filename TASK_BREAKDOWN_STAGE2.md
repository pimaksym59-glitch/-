# TASK_BREAKDOWN — Stage 2 (Configuration)

**Статус:** утверждён с правками владельца (v2). Цель (§R13.1 шаг 2, §R3.4): единый
**типизированный** загрузчик конфигурации; **секреты только через env** (§R12.2/§R3.7); параметры
из §Appendix B как config-first; **fail-fast** при неверном конфиге.

Правила: MASTER_SPEC — SoT; Architecture Freeze ACTIVE; серия коммитов на этап + один тег в конце.

---

## Приоритет источников (по правке владельца — env-first)

От низшего к высшему (правый побеждает):

```
defaults (код)  <  yaml (опционально)  <  .env  <  переменные окружения  <  CLI overrides (зарезервировано)
```

Явное разделение:
- **Секреты (API-ключи, пароль/URL БД, токены) — ТОЛЬКО env/.env.** YAML их не поставляет
  (yaml-источник отфильтровывает секретные поля — гарантируется тестом).
- **Business config (несекретные параметры) — yaml** (+ дефолты в коде, оверрайд env).
- CLI overrides — слот на будущее (не реализуется сейчас, `если будут`).

## Границы этапа

**В scope:** Settings + валидация + слои env/yaml + `.env.example` + `config/*.yaml` + safe snapshot
+ config doctor + аксессор + юнит-тесты + отчёты.
**Вне scope — НЕ делать (подтверждено владельцем):** никакого `SELECT channel_settings`, никаких
Repository, никакого SQLAlchemy, никакого Redis, никаких провайдеров, никакого Docker. Слой
БД(канал) — **только зарезервировать место** (комментарий/хук), без логики.

---

## Последовательность задач (порядок по правке владельца)

### T2.0 — Dependencies + gate совместимости (Python 3.14) 🔴
- **Действие:** добавить в `pyproject.toml` `pyyaml` (формат `config/*.yaml`) и `types-PyYAML`
  (dev); установить `pydantic`, `pydantic-settings`, `pyyaml` в `.venv`.
- **Критерий:** `import pydantic, pydantic_settings, yaml` OK на venv 3.14; версии — в отчёт.
- **⚠️ При провале gate (нет wheel pydantic-core под 3.14):** **НЕ предпринимать автоматических
  действий.** Остановиться, подготовить отчёт с причиной и вариантами решения. **Не менять версию
  Python и не создавать ADR без подтверждения владельца.**
- **Файлы:** `pyproject.toml`.

### T2.1 — Settings
- **Действие:** `app/core/config.py` — `Settings(BaseSettings)`, полностью типизирован. Поля:
  окружение (`app_env`), инфра (объявить `database_url`, `redis_url` — без подключения),
  **секреты `SecretStr | None`** (`anthropic_api_key`, `openai_api_key`, …; None ⇒ фейк §R2.10;
  без дефолтов), платформенные константы §R4.6 (`embedding_model`, `embedding_dim_text`,
  `clip_dim`), дефолты §Appendix B, `log_level`, `storage_dir`.
- **Критерий:** mypy strict; импорт без сайд-эффектов; секреты — `SecretStr` без дефолтов.
- **Файлы:** `app/core/config.py`.

### T2.2 — Configuration Validation (fail-fast)
- **Действие:** Pydantic-валидаторы/constraints: диапазоны (`similarity_threshold∈[0,1]`,
  `humanness_min∈[0,100]`, окна/лимиты `>0`, `epsilon_min∈[0,1]`), URL-формат (`database_url`/
  `redis_url` при наличии), enum (`app_env`, `log_level`), директории (`storage_dir` — существует
  или создаётся), таймауты/размеры/лимиты `>0`. Неверный конфиг ⇒ `ValidationError` на старте.
- **Критерий:** невалидные значения падают немедленно с понятным сообщением; покрыто тестами.
- **Файлы:** `app/core/config.py` (доп.).

### T2.3 — YAML (business config, опционально)
- **Действие:** кастомный yaml-источник в `settings_customise_sources` (приоритет: env > dotenv >
  **yaml** > field-defaults). Читает `config/global.yaml` + поверх `config/{app_env}.yaml`.
  **Источник исключает секретные поля** (секреты только env). Отсутствие файла — мягкая деградация.
- **Критерий:** env перекрывает yaml; `{env}` перекрывает `global`; секрет в yaml **игнорируется**
  (тест); нет файла — не падает.
- **Файлы:** `app/core/config.py` (доп.), `config/global.yaml`, `config/development.yaml`,
  `config/production.yaml` (только несекретные дефолты).

### T2.4 — `.env.example`
- **Действие:** шаблон **имён** всех env-переменных (инфра + секреты), с пометками
  обязательные/опциональные; **без значений-секретов**.
- **Критерий:** покрывает все env-поля; `.env` в `.gitignore`; секретов нет.
- **Файлы:** `.env.example`.

### T2.5 — Safe Snapshot
- **Действие:** `Settings.to_safe_dict()` — несекретные поля как есть, **секреты замаскированы**
  (`OPENAI_API_KEY → ************`), пригодно для логов. `None`-секрет → помечен как unset.
- **Критерий:** ни одно реальное значение секрета не попадает в вывод (тест).
- **Файлы:** `app/core/config.py` (доп.).

### T2.6 — Config Doctor
- **Действие:** `python -m app doctor` (`app/__main__.py`, argparse) — печатает статус **конфигурации**
  (✓/✗ env loaded, yaml loaded, redis configured, postgres configured, storage configured, openai
  configured, anthropic configured, …). **Только проверка конфига — без сетевых подключений.**
- **Критерий:** запускается, отражает реальное состояние Settings; ничего не коннектит; типизирован.
- **Файлы:** `app/__main__.py`.

### T2.7 — Tests (TDD, offline)
- **Действие:** `tests/core/test_config.py` (+ `tests/core/__init__.py`), `tests/core/test_doctor.py`:
  приоритет env>yaml>default; merge global+{env}; **секрет из yaml игнорируется**; валидация
  (диапазон/URL/enum/директория → ошибка); `to_safe_dict` маскирует; doctor-вывод корректен;
  отсутствие yaml не ломает.
- **Критерий:** зелёные, offline; покрывают §R3.4/§R3.7/§R12.2/§Appendix B.
- **Файлы:** `tests/core/__init__.py`, `tests/core/test_config.py`, `tests/core/test_doctor.py`.

### T2.8 — Reports + закрытие
- **Действие:** обновить `README.md`; подготовить `STAGE2_REPORT.md`, `CODE_AUDIT_STAGE2.md`,
  `RELEASE_NOTES_STAGE2.md`; верификация `ruff format/check` + `mypy --strict` + `pytest`; серия
  коммитов Этапа 2 + один тег `stage-2-config`.
- **Критерий:** всё зелёное; секреты не в git; дерево чистое; тег на финальном коммите.

---

## Создаваемые/изменяемые файлы (сводно)

| Файл | Действие |
|---|---|
| `pyproject.toml` | +`pyyaml`, +`types-PyYAML` (dev) |
| `app/core/config.py` | новый — Settings + validation + yaml-источник + `to_safe_dict()` + `get_settings()` |
| `app/__main__.py` | новый — `doctor` (config-only) |
| `config/global.yaml` · `development.yaml` · `production.yaml` | новые — несекретные дефолты |
| `.env.example` | новый — шаблон переменных |
| `tests/core/__init__.py` · `test_config.py` · `test_doctor.py` | новые — тесты |
| `README.md` | edit — раздел конфигурации |
| `STAGE2_REPORT.md` · `CODE_AUDIT_STAGE2.md` · `RELEASE_NOTES_STAGE2.md` | новые — отчёты |

## Граф зависимостей

`T2.0 → T2.1 → T2.2 → T2.3 → T2.4 → T2.5 → T2.6 → T2.7 → T2.8`

---

## Риски

| # | Риск | Уровень | Митигация |
|---|---|---|---|
| R1 | pydantic-core без wheel под Python 3.14 | 🔴 | gate T2.0; **при провале — СТОП + отчёт + варианты; без авто-смены Python и без ADR без подтверждения владельца** |
| R2 | Неверный приоритет источников | 🟠 | явный `settings_customise_sources` (env>dotenv>yaml>default); тест приоритета |
| R3 | Секрет в yaml/логе/снапшоте | 🟠 | секреты только env; yaml-источник фильтрует секреты; `SecretStr`; `to_safe_dict` маскирует; тесты |
| R4 | Scope creep (БД/Redis/провайдеры/логгер) | 🟡 | только объявление полей + место под БД-слой; логика — Этапы 6–7/11 |
| R5 | `pyyaml` — оправданность | 🟢 | формат задан §R3.4; реализация, не архитектура (без ADR) |
| R6 | Рассинхрон дефолтов Appendix B | 🟢 | значения строго из §Appendix B; отметить в аудите |

---

> План v2 утверждён владельцем. Реализация начинается с gate T2.0; при непрохождении — остановка и
> отчёт без автодействий. Этап 3 не начинать.
