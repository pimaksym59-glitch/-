# ARCHITECTURE_AUDIT_STAGE2.md — Architecture Compliance Audit (Stage 2)

**Дата:** 2026-07-22 · **Область:** результаты Этапа 2 (Configuration). **Режим:** только анализ,
код не изменялся. **Инструменты:** ruff, mypy --strict, pytest, pytest-cov, статический разбор импортов.

---

## 1. Соответствие MASTER_SPEC

| Требование | Статус | Доказательство |
|---|---|---|
| §R3.4 приоритет `env > .env > yaml > defaults` | ✅ | `settings_customise_sources` порядок `init>env>dotenv>yaml>file_secret` (config.py:154-170) |
| §R3.4 слой БД(канал) — только зарезервирован | ✅ | docstring config.py:12-13; логики нет (см. п.2/15) |
| §R3.7 config-first, без «магии» | ✅ | параметры §Appendix B — поля Settings; нет хардкода в логике |
| §R12.2 секреты только env, маскирование, не в логах | ✅ | yaml-источник отфильтровывает секреты (config.py:87-88); `SecretStr`; `to_safe_dict` (172-187) |
| §R4.6 embedding — платформенные константы | ✅ | `embedding_model/dim_text/clip_dim` на уровне платформы (123-125) |
| §Appendix B дефолты | ✅ | значения совпадают (128-137) |
| §R2.10 None ⇒ фейк (задел) | ✅ (reserved) | секреты `SecretStr\|None = None`; выбор фейка — Этап 11 |

**Вывод:** требования Этапа 2 выполнены; отступлений от MASTER_SPEC не обнаружено.

## 2. Архитектурные отклонения
Не обнаружено. Реализовано ровно в границах плана: конфигурация, без БД/Redis/провайдеров/Docker.
Слой БД(канал) корректно **не реализован**, только задокументирован как место (не заглушка-костыль).

## 3. Соответствие слоям (Layer Rules §R3.1)
- `app/core/config.py` — инфраструктурный слой; **не импортирует ничего из `app.*`** (только stdlib +
  pydantic + yaml).
- `app/__main__.py` — entrypoint; импортирует только `app.core.config`.
- Guard `tests/test_layering.py` — зелёный. Нарушений направления зависимостей нет.

## 4. Циклические импорты
**Отсутствуют.** Единственное внутреннее ребро: `app.__main__ → app.core.config`. `config` не
зависит от `app.*` ⇒ цикл структурно невозможен.

## 5. Dependency Graph
```
app.__main__ ──▶ app.core.config ──▶ [stdlib: functools, os, enum, pathlib, typing, urllib]
                                   └▶ [3rd-party: pydantic, pydantic_settings, yaml]
```
Внешние: `pydantic 2.13.4`, `pydantic-core 2.46.4`, `pydantic-settings 2.14.2`, `pyyaml 6.0.3`.
Граф ацикличен, глубина 1 (внутри app).

## 6. Public API модулей
- `app.core.config`: `Settings`, `get_settings()`, `AppEnv`, `LogLevel`, `SECRET_FIELDS`,
  `secret_field_names()`, `CONFIG_DIR`, `PROJECT_ROOT`. Приватные: `_YamlBusinessConfigSource`,
  `_validate_url`, `_is_secret_annotation` (префикс `_`).
- `app.__main__`: `main(argv)`, `doctor()`, `_marks()`, `_yaml_present()`.
- **Наблюдение:** `__all__` не задан — публичный API неявный (см. Notes N4).

## 7. Configuration API
`get_settings()` — кэшированный (`lru_cache`) синглтон; `Settings.to_safe_dict()` — снапшот для
логов. API минимален и типизирован. **Наблюдение:** `get_settings()` не покрыт тестами (тесты
конструируют `Settings()` напрямую для изоляции) — coverage line 205 (см. N3).

## 8. Pydantic модели
- `Settings(BaseSettings)` — все поля типизированы; ограничения через `Field(ge/le/gt)`; enum'ы
  `StrEnum`; `model_config` (`extra="ignore"`, `case_sensitive=False`).
- Валидаторы: `field_validator` для URL, `model_validator(after)` для storage_dir.
- **Наблюдение:** `model_validator _ensure_storage_dir` создаёт директорию — **побочный эффект ФС
  при загрузке конфига** (config.py:149-152) — см. N1.

## 9. Secret Handling — ключевой фокус
| Контроль | Статус |
|---|---|
| Секреты только из env/.env (yaml исключает) | ✅ config.py:87-88, тест `test_secret_never_sourced_from_yaml` |
| Секреты без дефолт-значений | ✅ `SecretStr\|None=None` |
| Не раскрываются в repr/str | ✅ `test_secret_not_leaked_in_repr` |
| Snapshot маскирует (`************`), None→`<unset>` | ✅ `test_to_safe_dict_masks_secrets` |
| Doctor не печатает секрет | ✅ `test_doctor_does_not_leak_secret` |
| `.env` в gitignore; `.env.example` без значений | ✅ |
Замечаний по безопасности нет.

## 10. YAML parser
- `yaml.safe_load` (не `load`) — безопасно от произвольных объектов. ✅
- Мердж `global` + `{app_env}`; ключи lower-case; не-dict/пустой файл → мягко игнорируется. ✅
- **Наблюдение:** выбор `{app_env}.yaml` берёт `APP_ENV` из `os.environ` напрямую (config.py:78) —
  значение только из `.env` (без экспорта в окружение) **не переключит** env-специфичный yaml,
  выберется `development`. Поведенческий нюанс — см. N2 (важно для Docker, Этап 3).

## 11. Doctor CLI
- `python -m app doctor` — проверка **только конфига**, без сетевых подключений. ✅ (проверено: exit 0)
- ✓/✗ с ASCII-fallback при неподдерживаемой кодировке stdout. ✅
- `python -m app` без команды → help, exit 1. ✅
- Покрытие 90% (непокрыто: ветка ASCII-fallback 20-21 и `__main__`-guard 68 — безобидно).

## 12. Покрытие тестами
- **23 теста**, offline; **coverage 97%** (config.py **98%**, __main__.py **90%**).
- Непокрытые строки — доброкачественные: `get_field_value` (config:92, требуется ABC, но
  pydantic-settings v2 использует `__call__`), `get_settings` (config:205), ASCII-fallback и
  `__main__`-guard в __main__. **Логических пробелов нет.**

## 13. Type Coverage
- `mypy --strict` — **0 ошибок на 31 файле**. `disallow_untyped_defs`/`no_implicit_reexport` активны.
- `Any` используется ограниченно и обоснованно: динамические данные yaml (`dict[str, Any]`) и
  интроспекция аннотаций (`_is_secret_annotation`). Ни одного `# type: ignore`/`noqa`.

## 14. Возможные технические долги
**Явного долга нет** (0 TODO/FIXME/HACK/type:ignore). Кандидаты на внимание — в Notes (не долг):
дублирование дефолтов Appendix B, побочный эффект storage_dir, неявный public API.

## 15. Что может усложнить Этапы 3–16
| # | Форвард-риск | Затрагивает |
|---|---|---|
| F1 | `APP_ENV` должен быть **реальной env-переменной** (не только в `.env`) для выбора `{env}.yaml` | Этап 3 (Docker/compose — задать `APP_ENV` в `environment`) |
| F2 | `storage_dir.mkdir` при загрузке конфига — в read-only контейнере может падать | Этап 3 (Docker), Этап 12 |
| F3 | `get_settings()` кэширован (`lru_cache`) — тестам поздних этапов нужен обход/сброс (паттерн уже есть) | Этапы 4–18 |
| F4 | `database_url` допускает и `postgresql`, и `postgresql+asyncpg` — для asyncpg нужен `+asyncpg` | Этап 4 (БД) |
| F5 | `telegram_bot_token` (платформенный) vs per-channel `bot_token_ref` (БД) — нужно правило приоритета | Этапы 7/16 |
| F6 | Контракт §R2.10 «None ⇒ фейк» задекларирован, но не реализован | Этап 11 (провайдеры) |
| F7 | Дублирование дефолтов Appendix B (код ↔ yaml ↔ MASTER_SPEC) | все этапы (согласованное редактирование) |

Все — **управляемые**, требуют лишь учёта на соответствующем этапе; ни один не блокирует и не
требует изменения архитектуры.

---

## Notes (сводно)
- **N1** storage_dir создаётся как side-effect при загрузке конфига → см. F2.
- **N2** `APP_ENV` для yaml берётся из `os.environ` напрямую → см. F1.
- **N3** `get_settings()` не покрыт тестом (изоляция через прямой `Settings()`).
- **N4** `__all__` не задан — по мере роста модулей стоит зафиксировать публичный API.
- **N5** дублирование дефолтов Appendix B (уже отмечено в DOCUMENT_AUDIT_V2 / CODE_AUDIT_STAGE2).

---

## Оценка

# ✅ PASS WITH NOTES

Архитектура Этапа 2 **полностью соответствует MASTER_SPEC**: слои соблюдены, циклов нет, типизация
строгая (0 ошибок), секреты защищены и протестированы, покрытие 97%, технического долга нет.
Выявлены **непринципиальные заметки (N1–N5)** и **7 управляемых форвард-рисков (F1–F7)**, ни один
из которых не является нарушением архитектуры и не требует правок сейчас. Рекомендуется учесть F1/F2
при Этапе 3 (Docker) и F4/F6 — при Этапах 4/11.

Изменений не вносил (режим анализа). Этап 3 не начинаю.
