# ADR_SUMMARY.md — Architectural Decision Summary (Stages 1–20)

**SoT:** `MASTER_SPEC.md` v2.0 (Appendix A holds the full 44-decision reconciliation ledger). This is the
consolidated summary; see `docs/adr/` for individual ADRs.

---

## 1. Foundational decisions (MASTER_SPEC Appendix A — 44 total, key ones)

| # | Decision | Rationale |
|---|---|---|
| 1 | Modular monolith (not microservices) | one deploy unit; roles = image commands (§R12.3) |
| 2 | Two system prompts (builder ≠ runtime) | build-time vs run-time concerns separated |
| 3 | One-directional layered deps | prevents cycles; testable (§R3.1) |
| 5 | Channel profile: DB is truth, YAML is seed | runtime edits without redeploy |
| 6/7 | Embeddings on owner row; dimension is a platform constant | isolation + stable pgvector schema (text 1536, CLIP/face 512) |
| 8 | UUIDv7 PK (`uuid6`) | time-ordered ids |
| 9/10 | Soft delete + partial unique; optimistic lock `version` | 24/7 safety |
| 11 | Persona (voice) ≠ Actor (visual) | independent evolution |
| 13/22 | `MAX_REWRITES=3` ≠ `MAX_RETRIES=5` ≠ `IMAGE_MAX_REGEN=3` | distinct control loops |
| 15/16 | Self-review = rule-gates + LLM-judge; self-learning = bandit | quality + optimization |
| 17 | Routing: body=`claude-opus-4-8`, judge/CTA/topic=`claude-haiku-4-5` | cost/quality |
| 18/20 | Text dup cascade (trigram→sentence→vector); image dup phash≠scene≠CLIP | cheap→expensive |
| 23/26/27 | Bot API/aiogram; at-least-once → `needs_review`; rate-limit per-bot key | delivery semantics (§R7) |
| 28/29 | Continuation-chaining (not DAG); LEAD_TIME | pipeline as tasks (§R8.4/§R8.5) |
| 30/42 | Multi-instance scheduler = idempotent slot + advisory; distributed rate-limiter (Redis) | correctness under N instances |
| 31/32/33 | RAG channel isolation = hard filter; KB=documents/document_chunks; Style Memory=features | §R9 |
| 34/35/36/37 | Panel = services/api client; analytics shows only available; 5-role RBAC backend; audit_log/config_versions | §R10 |
| 43/44 | Hot-table migrations expand-contract; secrets via secret manager + least-privilege | §R12 |

## 2. Later decisions (during implementation)

- Base image `python:3.13-slim`; floor `>=3.13` (dev venv 3.14); prod image 3.13.
- UUIDv7 = `uuid6`; dev-deps via PEP 735 `[dependency-groups]`; initial migration via `Base.metadata.create_all`.
- Scheduler slot idempotency via `dedup_key` pre-filter (Producer unchanged).
- AI Engine sees Validation only through the `OutputValidator` Protocol.
- Memory/RAG kernel storage-agnostic (Store Protocols, no pgvector/FAISS in the kernel).
- Validation Engine **stdlib-only**; Analytics **stdlib-only**; Admin **no fastapi**; Telegram **no aiogram**;
  Image Engine provider-agnostic (aspect = model, not string literals) — all for maximal independence.
- Test infrastructure lives **outside `app/`** (Stage 19) so production never depends on tests.

## 3. Open ADRs (owner-owned; defaults active)

| ADR | Topic | State | Default |
|---|---|---|---|
| ADR-001 | MTProto stats adapter (§R12.14, Appendix C) | Proposed | not introduced |
| ADR-002 | Deployment environment | Proposed | VM + Compose + Caddy |

## 4. Architecture Freeze

Active since Stage 2. No stage changed the frozen architecture without an ADR; Stages 3–20 required none.
Stage 20 changes documentation only. Full change ledger: `MASTER_SPEC.md` Appendix A + `docs/adr/`.
