# Changelog

All notable changes to this project. Format based on [Keep a Changelog](https://keepachangelog.com/);
versioning per [`docs/release/versioning.md`](docs/release/versioning.md). Dates use placeholders until a
release is cut.

## [Unreleased]

- Nothing pending; project is code-complete for Stages 1–20 (offline). Remaining work is Runtime Verification
  (see `RUNTIME_VERIFICATION_REGISTRY.md`).

## [0.1.0] - <DATE>

Initial code-complete, offline-verified build of the AI Telegram Automation Platform (Stages 1–20). Not yet
deployed to production (pending Production Readiness Review).

### Added — by stage

- **1** Repository structure, toolchain, layering guard (`stage-1-baseline`).
- **2** Configuration (env-first Settings, `doctor`) (`stage-2-config`).
- **3** Docker/Compose (one image, roles, Caddy) (`stage-3-docker`).
- **4** PostgreSQL(+pgvector), 25 ORM tables, repositories, Alembic (`stage-4-database`).
- **5** Redis (cache/rate-limit/locks/idempotency/pub-sub) (`stage-5-redis`).
- **8** Task queue + handler registry (`stage-8-queue`).
- **9** Scheduler (timing/DST/advisory/materializer) (`stage-9-scheduler`).
- **10** API (factory/lifespan/DI/errors/pagination/health) (`stage-10-api`).
- **11** Provider abstractions + fakes (LLM/Image/Embedding/Telegram) (`stage-11-providers`).
- **12** AI Engine (`stage-12-ai-engine`).
- **13** Memory / Knowledge / RAG (`stage-13-rag`).
- **14** Validation Engine (`stage-14-validation`).
- **15** Image Engine (`stage-15-image-engine`).
- **16** Telegram Engine (no aiogram) (`stage-16-telegram-engine`).
- **17** Analytics & Observability (`stage-17-analytics`).
- **18** Admin Panel & Control Center (`stage-18-admin-panel`).
- **19** Test Infrastructure (outside `app/`) (`stage-19-tests`).
- **20** Documentation, Release Engineering & Production Readiness (`stage-20-docs`).

### Engineering

- ruff clean; `mypy --strict` Success (0 `type: ignore`); pytest 466 passed / 6 skipped; domain coverage
  97–100%; Architecture Freeze preserved throughout.
