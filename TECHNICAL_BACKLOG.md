# TECHNICAL_BACKLOG.md

**Дата:** 2026-07-22 · **Источник:** ARCHITECTURE_AUDIT_STAGE2 (N1–N5, F1–F7), CODE_AUDIT_STAGE2,
DOCUMENT_AUDIT_V2. **Режим:** только фиксация. Все пункты **Deferred** — не реализуются вне своего
этапа. Приоритет: P1 (высокий) / P2 (средний) / P3 (низкий).

---

## 1. Deferred Improvements (неблокирующие технические улучшения)

| ID | Описание | Причина | Этап | Приоритет | Статус |
|---|---|---|---|---|---|
| DI-1 | Задать `__all__` для публичного API модулей (`app.core.config`, `app.__main__`) | сейчас public API неявный (N4); по мере роста — риск случайных экспортов | по мере роста (3+) | P3 | Deferred |
| DI-2 | Единый источник дефолтов §Appendix B (код ↔ `config/global.yaml` ↔ MASTER_SPEC) | дублирование значений → риск рассинхрона (N5/F7) | все этапы | P2 | Deferred |
| DI-3 | Убрать side-effect `storage_dir.mkdir` из загрузки конфига (вынести в явную инициализацию) | конфиг-загрузка не должна мутировать ФС (N1); чистота + совместимость с read-only | 3 / 12 | P2 | Deferred |

## 2. Future Architecture Work (только на конкретных этапах)

| ID | Описание | Причина | Этап | Приоритет | Статус |
|---|---|---|---|---|---|
| FA-1 | Слой БД(канал)-оверрайда как высший business-config источник (§R3.4) | сейчас только зарезервировано место | 6–7 | P1 | Deferred |
| FA-2 | Выбор фейка провайдера при `secret is None` (§R2.10) | контракт задекларирован, не реализован (F6) | 11 | P1 | Deferred |
| FA-3 | Правило приоритета `telegram_bot_token` (платформенный) vs per-channel `bot_token_ref` (БД) | конфликт двух источников токена (F5) | 7 / 16 | P2 | Deferred |
| FA-4 | Структурированный JSON-логгер + маскирование секретов (§R12.9) | конфиг хранит только `log_level`; логгера нет | этап логирования | P2 | Deferred |
| FA-5 | Распределённый rate-limiter (Redis token-bucket, §R7.6/§R8.9) | in-process семафор не масштабируется на N воркеров | 8 / 12 | P1 | Deferred |

## 3. ADR Candidates (потенциально требуют нового ADR)

| ID | Описание | Причина | Этап | Приоритет | Статус |
|---|---|---|---|---|---|
| ADR-C1 | Фиксация версии Python (3.13 vs 3.14) | если остальной стек не встанет на 3.14 — смена floor = архитектурное решение | 4 / 16 | P1 (условный) | Deferred |
| ADR-C2 | Провайдер UUIDv7 (stdlib 3.14 vs backport для 3.13) | зависит от ADR-C1; влияет на PK-схему (§R4.3) | 6 | P2 | Deferred |
| ADR-C3 | Включение MTProto stats-адаптера (O-1) | ADR-001 `Proposed`; решение за владельцем | 11 | P2 (owner) | Deferred |
| ADR-C4 | Целевая среда развёртывания (O-2) | ADR-002 `Proposed`; решение за владельцем | 12 | P2 (owner) | Deferred |

## 4. Operational Risks (Docker / Deployment / Secrets / Runtime)

| ID | Описание | Причина | Этап | Приоритет | Статус |
|---|---|---|---|---|---|
| OR-1 | `APP_ENV` задавать как реальную env-переменную (не только в `.env`) | иначе `{env}.yaml` не выберется, будет `development` (F1/N2) | 3 | P2 | **Addressed (Stage 3: compose `environment.APP_ENV`)** |
| OR-2 | `storage_dir.mkdir` при загрузке может падать в read-only контейнере | side-effect ФС (F2/DI-3) | 3 / 12 | P2 | **Mitigated (Stage 3: writable `storage` volume + non-root owner)**; DI-3 (убрать side-effect) — Deferred |
| OR-3 | Прод-секреты через secret manager / Docker secrets, не plaintext `.env` (§R12.2) | требование прод-безопасности | 3 / 12 | P1 | **Partially addressed (Stage 3: секреты только env, не в образ)**; secret manager — Deferred (12) |
| OR-4 | `database_url` для asyncpg должен использовать схему `postgresql+asyncpg` | валидатор допускает и `postgresql` (F4) | 4 | P2 | Deferred (compose уже использует `+asyncpg`) |
| OR-5 | `get_settings()` кэширован (`lru_cache`) — на рантайме конфиг фиксируется | смена env после старта не подхватится (F3) | runtime / 4+ | P3 | Deferred |
| OR-6 | Полный стек (asyncpg/pgvector/aiogram/anthropic/openai/pillow) не проверен установкой | pydantic-стек OK на 3.14 (T2.0); полный стек — только при `docker build` на 3.13 | 3 (build) / 4 / 16 | P1 | **Open — не проверен (Docker Engine недоступен в среде)** |
| OR-7 | Нативная валидация Docker-артефактов (`docker compose config`, `caddy validate`, `docker build`) | Docker Engine недоступен → выполнена только статика (YAML/структура) | 3 (при Docker) | P2 | **Open — pending Docker Engine** |

## 5. Testing Gaps (желательно покрыть тестами)

| ID | Описание | Причина | Этап | Приоритет | Статус |
|---|---|---|---|---|---|
| TG-1 | Тест `get_settings()` (аксессор + кэш) | не покрыт (N3, coverage line 205) | 2 follow-up | P3 | Deferred |
| TG-2 | Ассерт платформенных констант §R4.6 (`embedding_model/dim_text=1536/clip_dim=512`, не per-channel) | реализовано, но нет теста (см. TRACEABILITY) | 2 follow-up | P2 | Deferred |
| TG-3 | Полный ассерт дефолтов §Appendix B (сейчас проверены 4 из 10) | частичное покрытие (см. TRACEABILITY) | 2 follow-up | P2 | Deferred |
| TG-4 | Ветка ASCII-fallback в `_marks()` (кодировка stdout) | не покрыта (coverage 20-21) | 2 follow-up | P3 | Deferred |
| TG-5 | Doctor «всё сконфигурировано» (позитивный путь со всеми секретами) | покрыт только смешанный/пустой путь | 2 follow-up | P3 | Deferred |

---

**Итого:** 3 Deferred Improvements · 5 Future Architecture Work · 4 ADR Candidates · 7 Operational
Risks · 5 Testing Gaps. Обновлено после Этапа 3: OR-1 addressed, OR-2/OR-3 partially, OR-6/OR-7 open
(Docker недоступен). Ни один не блокирует Этап 4. Реализуются строго на указанных этапах и/или по
отдельной команде владельца.
