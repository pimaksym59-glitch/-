# DOCKER_AUDIT_STAGE3.md — Финальный аудит Этапа 3 (Docker)

**Дата:** 2026-07-22 · **Режим:** только анализ, код не изменялся. **Ограничение:** Docker Engine
недоступен → динамические проверки не выполнялись; ниже — статический разбор артефактов
(`docker/Dockerfile`, `docker-compose.yml`, `docker/Caddyfile`, `docker/postgres/init.sql`,
`.dockerignore`).

---

## 1. Dockerfile ↔ MASTER_SPEC
| Требование | Статус | Доказательство |
|---|---|---|
| §R12.3 один образ для всех ролей | ✅ | роль = `command`; entrypoint не зашит |
| §R12.4 non-root | ✅ | `useradd appuser`; `USER appuser` после `chown` |
| §R12.4 multi-stage / минимальность | ✅ | builder→runtime; `slim`; `build-essential` только в builder |
| §R12.4 HEALTHCHECK | ✅ | config-liveness (doctor); readiness api — этапы 10/12 (N3) |
| §R12.4 graceful shutdown | ✅ (заготовка) | **exec-form** `CMD`/`HEALTHCHECK` → SIGTERM доходит до PID1; graceful worker — этап 8 |
| §R12.2 нет секретов в образе | ✅ | секретов нет; `.dockerignore` исключает `.env` |

## 2. docker-compose.yml ↔ MASTER_SPEC
| Требование | Статус | Доказательство |
|---|---|---|
| §R12.3 роли одного образа | ✅ | `x-app` anchor + `<<:`; `command` на роль |
| §R12.5 least exposure | ✅ | порты публикует только `caddy` (проверено скриптом) |
| §R12.5 egress для внешних API сохранён | ✅ | `internal` — обычный bridge (не `internal: true`) |
| §R4.1 PostgreSQL 16 + pgvector | ✅ | `pgvector/pgvector:pg16` + `init.sql` |
| §R12.4 healthcheck'и инфры | ✅ | postgres `pg_isready`, redis `ping`; `depends_on: service_healthy` |
| именованные volume'ы | ✅ | `pgdata/redisdata/storage/caddydata/caddyconfig` |
| §R12.2 секреты только env | ✅ | `POSTGRES_PASSWORD` обязателен (`:?`), не в образ |
| готовность к этапам без арх. изменений | ✅ | профиль `app`; команды ролей соответствуют будущим entrypoints |
| §R12.11 resource limits | ⚠️ | не заданы (N2) — Этап 12 |

## 3. Caddyfile ↔ MASTER_SPEC
| Требование | Статус | Доказательство |
|---|---|---|
| §R12.5 reverse proxy | ✅ | `reverse_proxy api:8000` |
| §R12.5 security-заголовки | ✅ | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `-Server` |
| §R12.5 HTTPS/TLS | ⚠️ | локально `:80`; прод-домен/auto-HTTPS — Этап 12 (N5) |

## 4. Безопасность контейнеров
| Аспект | Статус | Комментарий |
|---|---|---|
| non-root | ✅ | `appuser` uid 10001 |
| writable directories | ✅ | пишется только `/app/storage` (volume, non-root owner); rootfs не read-only (N1) |
| secrets | ✅ | только env; не в образе/логах/git |
| published ports | ✅ | только `caddy` (80/443) |
| volumes | ✅ | именованные; init.sql смонтирован `:ro` |
| capabilities | ⚠️ | **не** заданы `cap_drop: [ALL]`, `security_opt: no-new-privileges`, `read_only` (N1) — hardening Этап 12 |
| restart policy | ✅ | `unless-stopped` на инфре и app-ролях |

## 5. Готовность к Kubernetes (в будущем)
**Хорошо:** 12-factor конфиг (только env), stateless-приложение, один образ, non-root, HEALTHCHECK.
**Пробелы (→ этапы 10/12):** реальные liveness/readiness-эндпоинты (сейчас doctor, N3);
resource requests/limits (N2); секреты через K8s Secrets; cap hardening (N1). Хостнеймы БД/redis —
через env (`DATABASE_URL`/`REDIS_URL`), т.е. переносимы на K8s-сервисы. **Вывод: K8s-ready с notes.**

## 6. Готовность к CI/CD
Сборка из контекста; `.dockerignore` минимален; exec-form. **Пробел:** нет lock-файла →
невоспроизводимость версий (§R12.13, N4). CI сможет `build`/`compose config` при доступном Docker.
**Вывод: CI-ready с notes (lock-файл — Этап 12).**

## 7. Готовность к production
**Есть:** non-root, least exposure, секреты вне образа, healthcheck'и инфры, named volumes.
**Требует Этап 12 (N1/N2/N4/N5/N7):** прод-TLS (домен/HTTPS), secret manager вместо `.env`,
resource limits, cap hardening/read-only rootfs, lock-файл. **Вывод: PASS WITH NOTES.**

## 8. Архитектурные конфликты с этапами 4–16
**Не обнаружено.** `DATABASE_URL` уже `postgresql+asyncpg` (Этап 4); `pgvector` (Этапы 4/13); egress
сохранён (Этап 11 — провайдеры); роли зарезервированы профилем (Этапы 8–10). Конфликтов нет.

## 9. Временные решения, которые придётся «ломать»
**Ломающих — нет.** Будущие изменения — это **расширения/переопределения**, не сломы:
HEALTHCHECK→readiness, `command`→реальные entrypoints, Caddy `:80`→домен. **Один момент внимания
(N6):** discovery конфига опирается на запуск из `/app` (source) при одновременно установленном в
venv пакете (cwd-приоритет); кандидат на улучшение — `CONFIG_DIR` через env, чтобы допускать чистую
site-packages-установку. Это **не** блокер и не слом.

## 10. Документирование ограничений (Docker недоступен)
✅ Явно зафиксировано в `STAGE3_REPORT.md`, `CODE_AUDIT_STAGE3.md`, `RELEASE_NOTES_STAGE3.md`,
`TRACEABILITY_STAGE2.md` (🅲/⏳R), `TECHNICAL_BACKLOG.md` (OR-6/OR-7). Непроверенные требования не
засчитаны как выполненные.

---

## Notes
- **N1** нет cap hardening / read-only rootfs — Этап 12.
- **N2** нет resource limits (§R12.11) — Этап 12.
- **N3** api HEALTHCHECK = doctor, не readiness — этапы 10/12.
- **N4** нет lock-файла → невоспроизводимая сборка (§R12.13) — Этап 12.
- **N5** прод-TLS (домен/HTTPS) — Этап 12.
- **N6** config discovery зависит от cwd (кандидат: `CONFIG_DIR` через env).
- **N7** прод-секреты через secret manager вместо `.env` — Этап 12.
- **N8** вся runtime-верификация — pending Docker Engine (см. TRACEABILITY/BACKLOG).

---

## Оценка

# ✅ PASS WITH NOTES (static-only)

Артефакты контейнеризации **статически соответствуют** §R12.3–R12.5/§R4.1 и доп. требованиям
владельца; безопасность (non-root, least exposure, секреты вне образа, named volumes, restart) —
в порядке; **архитектурных конфликтов с этапами 4–16 и ломающих временных решений нет**. Notes
N1–N7 — hardening/prod-пункты, отложенные на Этап 12; **N8 — вся runtime-верификация не выполнена
(Docker недоступен) и явно не засчитана.** Код не изменялся.
