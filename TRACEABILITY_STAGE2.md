# TRACEABILITY_STAGE2.md — Requirement → Implementation → Tests → Status

**Дата:** 2026-07-22 · **Область:** требования MASTER_SPEC, относящиеся к **Этапам 1–2**.
**Режим:** только анализ (код не менялся). Требования Этапов 3+ — вне области (ещё не должны быть
реализованы).

Легенда статуса: **✅** реализовано и покрыто тестами · **⚠️** реализовано, но есть пробел в тестах
(сообщается) · **⏳** зарезервировано, срок — позже (не является пробелом).

---

## Этап 1 — Repository Structure

| # | Требование MASTER_SPEC | Реализация | Тесты / Верификация | Статус |
|---|---|---|---|---|
| 1 | §R2.1 модульный монолит (структура) | `app/` — 23 пакета по слоям | `test_repository_structure`, `test_layering` | ✅ |
| 2 | §R3.1 слои + направление зависимостей | пакеты + docstrings; правило слоёв | `test_layering` (AST-guard) | ✅ |
| 3 | §R3.2 ORM-модели — единый дом | пакет `app/models/` | `test_repository_structure` | ✅ (пакет; модели — этап 6 ⏳) |
| 4 | §R3.5 точки входа | `app/__main__` (doctor); `main/scheduler/workers` зарезервированы | `test_repository_structure` | ✅ / ⏳ (остальные entrypoints позже) |
| 5 | §R3.6 полная типизация + `py.typed` | `app/py.typed`; `pyproject` mypy strict | `mypy --strict` (0 ошибок); `test_py_typed_marker_present` | ✅ |
| 6 | §R3.9 tests зеркалят структуру | `tests/`, `tests/core/` | структура тестов | ✅ |
| 7 | §R3.7 запрещённое (нет SQL в api, секретов в коде) | правило слоёв; секреты env-only | `test_layering`; тесты конфига | ✅ |

## Этап 2 — Configuration

| # | Требование MASTER_SPEC | Реализация | Тесты | Статус |
|---|---|---|---|---|
| 8 | §R3.4 приоритет `env > .env > yaml > defaults` | `config.settings_customise_sources` | `test_env_overrides_yaml`, `test_yaml_provides_business_defaults`, `test_env_specific_yaml_overrides_global`, `test_missing_yaml_degrades_gracefully` | ✅ |
| 9 | §R3.7 config-first (параметры в конфиге, без «магии») | поля `Settings` из §Appendix B | `test_defaults_match_appendix_b` | ✅ |
| 10 | §R12.2 секреты только из env (yaml исключает) | yaml-источник strip секретов | `test_secret_never_sourced_from_yaml`, `test_secret_from_env` | ✅ |
| 11 | §R12.2 маскирование / не в логах | `SecretStr`, `to_safe_dict`, doctor | `test_secret_not_leaked_in_repr`, `test_to_safe_dict_masks_secrets`, `test_doctor_does_not_leak_secret` | ✅ |
| 12 | §R4.6 embedding — платформенные константы | `embedding_model/embedding_dim_text/clip_dim` (платформенный уровень) | **нет явного ассерта значений** | ⚠️ (см. Gap-1) |
| 13 | §Appendix B платформенные дефолты | 10 полей-параметров с дефолтами | `test_defaults_match_appendix_b` — проверены **4 из 10** | ⚠️ (см. Gap-2) |
| 14 | fail-fast валидация (§R3.7/§R2.x) | `Field(ge/le/gt)` + URL-валидаторы | `test_validation_range/humanness/bad_url/good_url` | ✅ |
| 15 | §R2.10 `None ⇒ фейк` (задел) | секреты `SecretStr\|None=None` | `test_defaults_match_appendix_b` (openai=None); выбор фейка — этап 11 | ✅ / ⏳ (реализация фейка — этап 11) |

### Plan-level deliverables (правки владельца; не отдельные `R*`, но поставлены и покрыты)
| Фича | Реализация | Тесты | Статус |
|---|---|---|---|
| Config Doctor | `app/__main__.py` | `test_doctor_*` (5) | ✅ |
| Safe Snapshot | `Settings.to_safe_dict` | `test_to_safe_dict_masks_secrets` | ✅ |
| storage_dir validation | `model_validator` | `test_storage_dir_created` | ✅ |

---

## Обнаруженные пробелы (только сообщение, без исправления)

- **Gap-1 (§R4.6):** платформенные embedding-константы **реализованы** (`embedding_dim_text=1536`,
  `clip_dim=512`, `embedding_model`), но **нет теста**, ассертящего их значения/платформенность.
  → backlog **TG-2** (P2). Требование НЕ без реализации — только без теста.
- **Gap-2 (§Appendix B):** все 10 дефолтов **реализованы**, но тест проверяет **4 из 10**
  (`similarity_threshold`, `humanness_min`, `history_window`, `max_retries`); не проверены
  `image_window`, `max_rewrites`, `image_max_regen`, `lead_time_minutes`, `epsilon_min`,
  `max_context_tokens`. → backlog **TG-3** (P2).

> Требований **без реализации** — не обнаружено. Оба пробела — только по тестовому покрытию значений
> (реализация присутствует и типобезопасна). Исправление отложено (код не меняется в этом режиме).

---

## Этап 3 — Docker (живое обновление; ⚠️ runtime НЕ верифицирован — Docker Engine недоступен)

Legenda доп.: **🅲** реализовано как конфиг/артефакт и статически проверено · **⏳R** runtime-
верификация отложена (требует Docker Engine) — **не** засчитывается как полное подтверждение.

| # | Требование | Реализация | Верификация | Статус |
|---|---|---|---|---|
| 16 | §R12.3 контейнеры = роли одного образа | `docker/Dockerfile` (один образ) + compose `command` на роль | статический разбор compose/Dockerfile | 🅲 / ⏳R |
| 17 | §R12.4 принципы контейнеров (non-root, multi-stage, healthcheck) | Dockerfile: `USER appuser`, builder→runtime, HEALTHCHECK; infra healthcheck'и | grep-проверки, YAML | 🅲 / ⏳R |
| 18 | §R12.5 reverse proxy / least exposure | Caddy; порты только у `caddy`; internal/public сети | скрипт (только caddy публикует) | 🅲 / ⏳R |
| 19 | §R4.1 PostgreSQL 16 + pgvector | `pgvector/pgvector:pg16` + `init.sql` (`vector`,`pg_trgm`) | статически | 🅲 / ⏳R |

> **Не выполнено (Docker недоступен):** `docker build`, `docker compose config`, запуск инфры,
> healthcheck-переходы, `python -m app doctor` в контейнере. Требования 16–19 **не** отмечены как
> полностью верифицированные (только 🅲, реализация-как-артефакт).

---

## Итог (живой)

**Этапы 1–2 (unit-верифицируемые): 15 требований.**
```
Coverage (implementation): 15 / 15 requirements
Coverage (test-asserted):  13 / 15 requirements
Gaps (impl OK, test missing): 2  → §R4.6 (Gap-1), §Appendix B полные значения (Gap-2)
Requirements without implementation: 0
```

**Этап 3 (Docker): 4 требования (§R12.3/4/5, §R4.1)** — реализованы как артефакты и статически
проверены (🅲), **runtime-верификация отложена (⏳R, Docker Engine недоступен)** и не засчитана.

Ни одно требование Этапов 1–3 **не осталось без реализации**. Пробелы: 2 тестовых ассерта (TG-2/TG-3,
Deferred) и runtime-верификация Docker (OR-6/OR-7, Open). Блокеров для Этапа 4 нет.
