# RELEASE NOTES — Stage 16 (Telegram Engine)

**Project:** AI Telegram Automation Platform · **Version:** 0.1.0 · **Date:** 2026-07-26
**Architecture Freeze:** ACTIVE · **SoT:** `MASTER_SPEC.md` v2.0

---

## Что сделано

**Library-agnostic Telegram Engine** в `app/telegram` (§R7) — транспорт поверх `TelegramProvider`
Protocol Этапа 11. **aiogram не импортируется**; никакой AI/Validation/Image-логики. Независим от тех
подсистем; взаимодействие только через публичные Protocol.

- **Исходящая публикация (§R7.8):** `PublishService` — modes text/photo/album через провайдер; formatter
  MarkdownV2/HTML + лимиты (§R7.7); отдельный `AttachmentPipeline`; `RateLimiter` **порт** (§R7.6);
  **отдельный слой** idempotency (dedup помечается до отправки, at-least-once §R7.4); **отдельный**
  `ErrorRecoveryPipeline` (ambiguous → needs_review); retry — **reuse** `workers` (§R7.5, req 11).
- **Входящая обработка:** `mapping` (сырой update → DTO — единственный слой, req 15) → `UpdateProcessingPipeline`
  → модульный `MiddlewarePipeline` → **декларативный** `Router` → типизированный потокобезопасный
  `HandlerRegistry` → независимые `CommandHandler`/`CallbackHandler`/`MessageHandler` Protocol (без базового
  класса, req 5) → `Dispatcher`.
- **Webhook/Polling** — взаимозаменяемые стратегии (req 10); **state** — `StateStore` порт (req 8);
  **SessionContext** immutable (req 7); **`MessagingPlatform`** — multi-platform seam (req 16).
- **Composition** — `app/services/telegram.py`: `build_telegram_engine` / `publish_post`.

Toolchain зелёный: ruff, mypy-strict (286 файлов, **0 `type: ignore`**), **pytest 337 passed /
6 skipped**; подсистема покрыта на **~99%**.

## ⚠️ Ограничение верификации (нет реального Bot API)

Реальный **Bot API/aiogram** (send/receive), **webhook/polling**, distributed rate-limiter под нагрузкой
(§R7.6), at-least-once-доставка (§R7.4) — **вне объёма Этапа 16**, отмечены **Runtime Verification
Pending (RV-15)**. Новых зависимостей нет (aiogram объявлен, не импортируется).

## Архитектурные инварианты (подтверждено)
- Telegram Engine не зависит от реализации AI/Validation/Image Engine (grep: не импортирует content/
  validators/images/memory/rag; они не импортируют telegram).
- Взаимодействие только через публичные Protocol; **aiogram не импортируется**.
- Новых циклов нет; layering guard зелёный.

## Следующий этап
**Этап 17 — Analytics** (§R13.1 шаг 17, §R11): надёжная внутренняя аналитика (cost/quality/system),
engagement — gated (§R7.3/R10.3), self-learning bandit. Начинается **только по отдельной команде**.
