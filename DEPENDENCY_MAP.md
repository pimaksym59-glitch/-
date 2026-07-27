# DEPENDENCY_MAP.md — Final Dependency Map (Stages 1–20)

**Project:** AI Telegram Automation Platform · **SoT:** `MASTER_SPEC.md` v2.0 · **Architecture Freeze:**
ACTIVE. Confirms the dependency invariants of the whole system. Enforcement lives in `tests/test_layering.py`
and the per-subsystem independence tests — this document consolidates the result.

---

## 1. Layer direction (§R3.1)

```
api → services → (domain, repositories) → models/db
```

Forbidden imports per layer (`tests/test_layering.py`):
- **api:** not `app.repositories` / `app.db` / `app.models` / `sqlalchemy`.
- **services:** not `app.api` / `fastapi`.
- **domain** (content, images, llm, telegram, memory, rag, validators, analytics, admin, notifications):
  not `app.api` / `app.services` / `app.repositories` / `app.db` / `fastapi`.
- **repositories:** not `app.api` / `app.services` / `fastapi`.

**Status:** green — `test_layer_dependency_direction` passes.

## 2. Domain independence

Each domain subsystem imports **only** stdlib + its own package + public Provider Protocols (Stage 11);
cross-subsystem wiring happens exclusively in composition roots via public Protocols/adapters.

| Subsystem | Imports another engine? | Independence guard |
|---|---|---|
| `app/content` (AI) | no | grep + layering |
| `app/validators` | no (stdlib-only) | grep + layering |
| `app/images` | no | grep + layering |
| `app/telegram` | no (no aiogram) | grep + layering |
| `app/memory`, `app/rag` | no (each other: Memory ⊥ Knowledge) | grep + layering |
| `app/analytics` | no (stdlib-only) | `tests/analytics/test_independence.py` |
| `app/admin` | no (no fastapi/starlette) | `tests/admin/test_independence.py` |
| Test framework (`tests/framework`) | consumes only public app surfaces | `tests/framework/test_independence.py` |

## 3. Composition roots (the only wiring points)

`app/services/{providers,ai,rag,validation,images,telegram,analytics,admin,health,lifecycle}.py`. Adapters
here bind domain ports to real/public backends (e.g. admin → Analytics `AuditPipeline`/`MetricsSnapshot`;
analytics → workers `Metrics`/`EventLogger`). Domains never import these backends directly.

## 4. Confirmations

- **No cyclic dependencies:** ✅ — layering guard + independence tests; `pipeline ⊄ audit_pipeline` (analytics),
  `authn → authz → rbac` one-way (admin), `Fixtures → Factories → Data` one-way (framework).
- **Correct layering:** ✅ — `tests/test_layering.py` green across all 27 `app/` packages.
- **Domain subsystems independent:** ✅ — no engine imports another; interaction only through public Protocols.
- **Production independent of tests:** ✅ — `app/` never imports `tests` (`tests/framework/test_independence.py`).
- **No architectural violations:** ✅ — Architecture Freeze respected on every stage; no ADRs required for
  Stages 3–20; Stage 20 adds documentation only (no `app/` change).

## 5. Third-party dependency direction (§R12.13)

Runtime deps (fastapi/uvicorn/pydantic/sqlalchemy/asyncpg/pgvector/redis/pillow/uuid6/…) are pinned in
`pyproject.toml`; domains depend on abstractions, not vendors (real vendor SDKs — aiogram/anthropic/openai —
are declared, not imported; adapters are RV-10/RV-15). See `docs/deployment/dependency-lock.md`.

## 6. Cross-references

Subsystem inventory → `ARCHITECTURE_MAP.md`; contracts → `PUBLIC_CONTRACT_REGISTRY.md`; unverified runtime →
`RUNTIME_VERIFICATION_REGISTRY.md`.
