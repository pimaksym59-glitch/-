# Frontend Architecture Freeze v1.0 & Implementation Roadmap

**Status:** the **design + engineering-architecture phase is COMPLETE & ACCEPTED**. This record establishes the
freeze, the change-management rule, and the implementation roadmap. No frontend code exists yet.

---

## 1. Accepted & frozen (v1.0)

Design & architecture artifacts are accepted and **frozen**:
- **FRONTEND_MASTER_SPEC v1.0** — single Source of Truth (`webplatform/FRONTEND_MASTER_SPEC.md`).
- **D1** Foundations · **D2** ONYX Design System v1.0 · **D3** Screen Maps · **D4** Full UI Specification ·
  **Preview Artifact** (`webplatform/design/`).
- **Stage 2** Frontend Architecture & Engineering Specification v1.0.
- **Stage 3** Frontend Technical Specification v1.0 (`webplatform/frontend/`).

**FRONTEND ARCHITECTURE FREEZE v1.0 is established.** Backend **Architecture Freeze** + **Production Code
Freeze** remain unchanged; **Design Freeze ONYX v1.0** remains unchanged; `MASTER_SPEC.md` and
`FRONTEND_MASTER_SPEC.md` remain the two Sources of Truth.

## 2. Change-management rule (no architecture changes during implementation)

During implementation, **architecture may not change on the fly**. Every change must fall into exactly one
category (same discipline as the backend):
- **PATCH** — a documentation or implementation fix that **does not change contracts** (UI contract, public
  interfaces, tokens' meaning, API mapping).
- **MINOR** — **additive** functionality that does not break existing contracts (new feature slice, new
  component variant, new theme, new workspace via D3 A9).
- **MAJOR** — an **architecture change** that breaks a contract: requires a **new spec version** and a separate
  **ADR** (per the Frontend ADR list, Stage 2 §15). No MAJOR lands without an approved ADR.

## 3. Implementation roadmap (functional stages, backend-style)

Each stage: **plan → approval → implement → gates → report → stop.**

| Stage | Scope |
|---|---|
| **FS1** | **Infrastructure only** (engineering scaffold — see §4) |
| FS2 | Routing & Navigation |
| FS3 | ONYX Components (design system in code) |
| FS4 | Authentication & RBAC |
| FS5 | Dashboard |
| FS6 | AI Chat |
| FS7 | Knowledge |
| FS8 | Memory |
| FS9 | Image Studio |
| FS10 | Prompt Library |
| FS11 | Analytics |
| FS12 | Platform & Admin |
| FS13 | Settings, Profile, Notifications |
| FS14 | Integration & Polish |
| FS15 | Production Readiness |

## 4. FS1 boundaries (fixed in advance)

**FS1 includes:** Next.js project creation · TypeScript config · App Router · FSD structure · ONYX design
tokens · themes (Dark/Light) · base layouts · Provider Tree · API Client · basic SSE infrastructure ·
Storybook · Vitest · Playwright · MSW · ESLint · Prettier · CI · empty routes · screen stubs.

**FS1 excludes:** Dashboard · Chat · Analytics · Knowledge · Image Studio · Prompt Library · Admin · any
business logic.

**Outcome of FS1:** an **engineering scaffold**, not a functional product. Detailed plan:
`webplatform/frontend/STAGE_FS1_PLAN.md`.

## 5. Method & authority

- Discipline preserved from the backend: plan-first, stop-for-approval, gates, reports, no scope creep.
- **Authority:** `FRONTEND_MASTER_SPEC` > Stage 2 > Stage 3 > code. ONYX v1.0 + backend contract are frozen
  inputs. The frontend never changes `app/` / public Protocols / `MASTER_SPEC.md`.
- **Environment note:** FS1 *implementation* produces the project source (files). Executing it (`pnpm install`,
  dev server, CI, Storybook, Playwright) requires a **Node toolchain**; where that toolchain is unavailable in
  the current environment, execution is treated as **Runtime Verification Pending** (analogous to the backend's
  RV), while the source scaffold is delivered and statically reviewed.

---

**Next action (awaiting your GO):** implement **FS1 (Infrastructure)** — beginning, per method, with
`STAGE_FS1_PLAN.md` (already prepared) → your approval → implementation. No code until FS1 is approved.
