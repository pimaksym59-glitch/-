# Web Platform — Design Freeze & Engineering Roadmap

**Status:** Design phase **COMPLETE & ACCEPTED**. This record establishes the freeze and the disciplined path
from design to code. No product code exists yet; the backend core remains untouched.

---

## 1. Acceptance & freezes (recorded)

- **D4 accepted.** The Web Platform **design phase is complete**: D1 (Product & UX Foundations) · D2 (ONYX
  Design System) · D3 (Screen Maps) · D4 (Full UI Specification) · Preview Artifact.
- **The Preview is the visual reference standard** for implementation.
- **Backend Architecture Freeze & Production Code Freeze** of the completed 20-stage core remain **unchanged**.
  Console is a client via `/api/v1` / `app.services.*` / public Protocols only.
- **Design Freeze: ONYX v1.0 is established.** Screen Specification v1.0 and UI Contract v1.0 are frozen.
- **Change management:** any change to the design system/screens/UI contract goes through the **versioning in
  D4 §12** and the **evolution rules in D4 §13** (MINOR = additive; MAJOR = breaking + migration note/ADR).
  No ad-hoc changes.

## 2. Principle carried over from the backend

The 20-stage backend succeeded because **architecture was approved before code**. The frontend keeps the same
discipline. We already have the *design* architecture (D1 product, D2 visual, D3 screens, D4 UI contract). What
remains before implementation is the **engineering architecture** — two dedicated stages, then disciplined
implementation. This removes "architecture decisions on the fly."

## 3. Roadmap (two engineering stages, then implementation)

### Stage 2 — Frontend Architecture (design of *how*, not code)
Answers "how is this design implemented?" Deliverables to define:
project structure · App Router · layouts · routing · data layer · streaming · auth flow · API client · error
boundaries · optimistic updates · theming · component composition · code splitting · lazy loading · cache
strategy · folder structure · testing strategy. Output: an architecture document + decision records. **No code.**

### Stage 3 — Frontend Technical Specification (engineering spec)
After architecture is approved. Defines the concrete engineering contract, e.g. a layered structure
(`app/ · components/ · features/ · shared/ · entities/ · widgets/ · lib/ · hooks/ · providers/ · styles/`):
which components are **shared** vs **feature-based** vs **reusable**, which are **lazy**, which are **server**
vs **client**, module boundaries, naming, and the mapping of D3/D4 screens+components onto files. **No code.**

### Frontend Implementation (disciplined stages, like the backend)
Only after Stage 2 + Stage 3 are approved. Indicative sequence (each: plan → approve → implement → gate →
report → stop):
`FS1 Infrastructure · FS2 Routing · FS3 Design System · FS4 Authentication · FS5 Dashboard · FS6 Chat ·
FS7 Knowledge · … · FS15 Production Polish`.

## 4. Working method (unchanged discipline)

Every stage above: **I prepare only the plan/spec first and STOP for your approval; I do not write code until
you approve; the backend `app/` / public Protocols / MASTER_SPEC stay frozen; ONYX changes only via D4
versioning.**

## 5. Current state

- **Design track:** `webplatform/design/` — D1–D4 + `preview.html` (published Artifact).
- **Next action (awaiting your GO):** **Stage 2 — Frontend Architecture.** Per method, I will first prepare
  **only the Stage-2 plan** (`webplatform/frontend/STAGE2_ARCHITECTURE_PLAN.md`), then stop for approval.

---

**No code is started. Awaiting your explicit go-ahead for Stage 2 (Frontend Architecture) — beginning with the
plan.**
