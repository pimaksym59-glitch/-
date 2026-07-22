# CODE_AUDIT_STAGE2.md — Аудит качества кода Этапа 2

**Область:** `app/core/config.py`, `app/__main__.py`, `config/*.yaml`, `.env.example`,
`tests/core/*`. **Дата:** 2026-07-22. **Метод:** self-review + ruff/mypy/pytest.

---

## 1. Clean Architecture (§R3.1)

| Критерий | Статус | Комментарий |
|---|---|---|
| `core` — инфраструктурный слой | ✅ | конфиг не зависит от domain/api/services; только stdlib + pydantic + yaml |
| Нет обратных зависимостей | ✅ | `app.core.config` ничего из `app.*` не импортирует; `app/__main__` зависит только от `core` |
| Слои не нарушены | ✅ | `tests/test_layering.py` (guard) — зелёный |

## 2. SOLID

- **SRP** — `config.py`: загрузка+валидация конфигурации; `__main__.py`: CLI/doctor. Раздельно.
- **OCP** — новые источники конфигурации добавляются через `settings_customise_sources` без правки
  полей; новые CLI-команды — через subparser без изменения `doctor`.
- **DIP** — секреты как `SecretStr\|None`; `None` ⇒ будущий выбор фейка (§R2.10), без жёсткой привязки.

## 3. Типизация (§R3.6)

- `mypy --strict` — **0 ошибок на 31 файле**. Все функции/методы аннотированы.
- Замечание mypy по `_env_file` (pydantic синтезирует `__init__` через `@dataclass_transform`)
  решено корректно: тесты отключают чтение `.env` через `model_config`, без `# type: ignore`.

## 4. Линтер / формат

- `ruff check` — **All checks passed** (включая исправленный UP042 → переход на `enum.StrEnum`).
- `ruff format` — всё отформатировано. E741 (`l`) в тестах устранён (`line`).

## 5. Безопасность конфигурации (§R12.2) — ключевой фокус этапа

| Контроль | Статус | Тест |
|---|---|---|
| Секреты только из env/.env | ✅ | yaml-источник фильтрует секретные поля; `test_secret_never_sourced_from_yaml` |
| Секреты без дефолтов-значений | ✅ | `SecretStr\|None = None` |
| Секрет не раскрывается в repr/str | ✅ | `test_secret_not_leaked_in_repr` |
| Snapshot маскирует секреты | ✅ | `to_safe_dict` → `************`; `test_to_safe_dict_masks_secrets` |
| Doctor не печатает секрет | ✅ | `test_doctor_does_not_leak_secret` |
| `.env` не в git | ✅ | `.gitignore`; `.env.example` — только имена |

## 6. Fail-fast валидация (§R2.x)

Диапазоны/URL/enum/директории проверяются на старте; невалидный конфиг → `ValidationError`.
Покрыто: `test_validation_range/humanness/bad_url/good_url`.

## 7. TDD / тестируемость

19 offline-тестов; изоляция через monkeypatch (`CONFIG_DIR`, `model_config.env_file`, env-vars).
Без сети/БД. Приоритет источников и merge yaml проверены явно.

## 8. Технический долг и «магия»

**Не обнаружено.** Нет TODO/FIXME/хардкода секретов. Значения §Appendix B заданы как дефолты
(код) и продублированы в `config/global.yaml` — см. наблюдение A.

## 9. Наблюдения и риски (не блокирующие)

| # | Наблюдение | Severity | Действие |
|---|---|---|---|
| A | Дефолты §Appendix B дублируются: код (`Settings`) ↔ `config/global.yaml` ↔ MASTER_SPEC | 🟡 | источник истины — §Appendix B; при изменении править согласованно (как и отмечено в DOCUMENT_AUDIT_V2) |
| B | Слой БД(канал) только зарезервирован (нет логики) | 🟢 | по плану; Этапы 6–7 |
| C | `max_context_tokens`/`epsilon_min` в §Appendix B были «на канал» без числа — заданы платформенные дефолты (8000 / 0.1) | 🟢 | значения-дефолты, переопределяемы; не противоречат спеку |
| D | Gate Python 3.14 пройден для pydantic-стека, но остальной стек (asyncpg/pgvector/aiogram) ещё не ставился | 🟡 | проверится на Этапах 4/16 |

## 10. Трассируемость к требованиям

§R3.4 (приоритет источников) · §R3.7 (config-first, без «магии») · §R12.2 (секреты env-only,
маскирование) · §R4.6 (embedding-константы) · §Appendix B (дефолты) · §R2.10 (None ⇒ фейк, задел).

## 11. Вердикт

**Этап 2 — чисто.** Конфигурация типобезопасна, env-first, секреты защищены и протестированы,
fail-fast, doctor работает. Долга нет. Готов к Этапу 3 **после подтверждения владельца**.
