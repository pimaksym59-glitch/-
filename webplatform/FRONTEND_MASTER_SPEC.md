# FRONTEND_MASTER_SPEC.md — Console Web Platform (Frontend Source of Truth) · v1.0

**This is the single Source of Truth for the entire frontend project**, the analog of the backend
`MASTER_SPEC.md`. Every subsequent stage (architecture, technical specification, implementation, testing)
references **this document**. Requirement IDs use `F<section>.<n>`. When any artifact conflicts with this
spec, **this spec wins** (below it: Stage-2 Architecture → Stage-3 Technical Spec → code).

**Status:** established at Design Freeze (ONYX v1.0). No frontend code exists yet.

---

## §F1. Vision & scope

**[F1.1]** Console is the premium, AI-first web client for the completed AI Telegram Automation Platform. It
implements the accepted design (D1–D4) and consumes the frozen backend **only** through its public surface.
**[F1.2] Scope:** the 25 screens (D3) across three surfaces (Workspace / Platform & Admin / Account),
streaming-first AI UX, RBAC-aware UI, WCAG AA+.
**[F1.3] Non-scope:** any backend change; any change to `app/`, public Protocols, or `MASTER_SPEC.md`.

## §F2. Frozen inputs (immutable references)

**[F2.1]** **Design:** D1 Foundations · D2 ONYX Design System · D3 Screen Maps · D4 UI Specification +
Preview Artifact (`webplatform/design/`). **[F2.2]** **Design System:** **ONYX v1.0** (frozen); changes only
via D4 §12 versioning + §13 evolution rules. **[F2.3]** **Backend contract:** `/api/v1` per `API_SPEC.md`;
`app.services.*`; public DTO/Protocol; RBAC matrix §R10.5; gated data §R10.3. **[F2.4]** **Backend freezes:**
Architecture Freeze + Production Code Freeze remain ACTIVE — the frontend never requires a backend change; any
desired streaming/WS endpoint is optional future backend work (RV), not a prerequisite.

## §F3. Non-negotiable principles (invariants)

**[F3.1]** **Design fidelity:** the UI matches ONYX tokens and the Preview visual standard; components consume
**semantic tokens only**. **[F3.2]** **Client-of-core:** the frontend is a pure client; no business logic that
belongs to the backend is re-implemented; RBAC is *reflected*, enforced server-side. **[F3.3]** **Streaming-
first:** AI/logs/jobs/metrics render progressively; no blocking spinners on AI surfaces. **[F3.4]**
**Keyboard-first & Command-Palette-first** (D1 §6). **[F3.5]** **Accessibility WCAG 2.1 AA+** is a build gate,
not an afterthought. **[F3.6]** **Type safety:** TypeScript `strict`, **zero `any`** in app code (escape
hatches justified + typed). **[F3.7]** **Architectural boundaries enforced** (import rules, layer direction) —
the same discipline that held the backend Architecture Freeze. **[F3.8]** **Truthful states:** gated/offline/
error are honest and specific; secrets are never stored or rendered.

## §F4. Product requirements (from D1–D4, restated as frontend obligations)

**[F4.1]** All 25 screens with the D3 states (empty/loading/error) and the unified Status vocabulary (D2 §11).
**[F4.2]** Universal Inspector, Universal Search (⌘K/search/deep-link/sidebar), Progressive Disclosure
(Beginner/Advanced/Power), Workspace Consistency (Nav/Content/Inspector/Actions). **[F4.3]** Every AI block
carries **Trust** (Generated/Verified/Needs-Review + Source-Available/None) and **Explainability** (why/data/
confidence/limits). **[F4.4]** Dark + Light themes (equal weight) + density (comfortable/compact). **[F4.5]**
Future-proof workspace slots (Voice/Automation/Agent/Marketplace/Integrations) without reworking existing
screens.

## §F5. Engineering constraints (fixed at v1.0)

**[F5.1] Framework:** Next.js (App Router) + React + TypeScript strict (rationale/versions in Stage 2 §2).
**[F5.2] Rendering:** Server Components by default; Client Components only where interaction/state requires
(Stage 2 §5). **[F5.3] Data:** typed API client + server-state cache with retry/dedup/cancel; SSE for
streaming with polling fallback; no localStorage for auth (Stage 2 §4/§8). **[F5.4] State ownership:** six
state kinds with clear owners (Stage 2 §7, mirrors D4 §7). **[F5.5] Styling:** ONYX tokens as CSS custom
properties are the source of truth; utility/CSS layering defined in Stage 2 §6. **[F5.6] A11y primitives:**
accessible headless primitives for dialog/menu/tabs/combobox/popover; command palette lib (Stage 2 §6).

## §F6. Quality gates (frontend, analog of the backend gate)

**[F6.1]** `eslint` (typescript-eslint strict + import-boundary rules) — clean. **[F6.2]** `tsc --noEmit`
strict — 0 errors, **0 unjustified `any`**. **[F6.3]** `prettier` — formatted. **[F6.4]** Tests green (unit/
component/integration/E2E) — Stage 2 §12. **[F6.5]** **Accessibility** automated checks (axe) pass; manual a11y
checklist (D4 §3) per screen. **[F6.6]** **Bundle-size budget** and **performance budget** met (Stage 2 §9).
**[F6.7]** **No architectural violations** (layer/import boundaries) — enforced in CI. **[F6.8]** Visual
regression against the Preview/Storybook baseline. A change cannot merge unless all gates pass.

## §F7. Security & RBAC (frontend obligations, §R10/§R12.2)

**[F7.1]** Session via HttpOnly/Secure/SameSite cookie; **no tokens in JS-accessible storage**. **[F7.2]**
Route protection (middleware + server checks); RBAC-aware rendering; 403 → permission state, never a crash.
**[F7.3]** CSP, XSS-safe rendering (sanitized Markdown), CSRF strategy aligned with backend. **[F7.4]** Secrets
are **write-only** in the UI (never fetched/rendered), per §R10.4.

## §F8. Performance & accessibility budgets (targets, refined in Stage 2)

**[F8.1]** FCP < 1.2s, LCP < 2.0s, TTI < 2.5s on a mid-tier device (staging). **[F8.2]** Initial route JS
budget defined per route group; large lists virtualized; heavy client modules lazy-loaded. **[F8.3]**
Reduced-motion/contrast honored; 200% zoom + 320px reflow usable; keyboard-complete for all key flows.

## §F9. Change management & versioning

**[F9.1]** Frontend artifacts are versioned independently: **FRONTEND_MASTER_SPEC v1.0** (this doc) · Frontend
Architecture v1.0 (Stage 2) · Frontend Technical Spec v1.0 (Stage 3). **[F9.2]** ONYX changes flow only through
D4 §12/§13. **[F9.3]** Fundamental changes (see the Frontend ADR list, Stage 2 §15) require an **ADR** — the
same discipline that protected the backend. **[F9.4]** Additive changes = MINOR; breaking = MAJOR + migration.

## §F10. Delivery method & roadmap

**[F10.1]** Staged delivery, backend-style: each stage = **plan → approval → implement → gate → report →
stop**. **[F10.2]** Sequence: **Stage 2** Frontend Architecture & Engineering Specification → **Stage 3**
Frontend Technical Specification → **Frontend Implementation FS1…FS15** (Infrastructure · Routing · Design
System · Auth · Dashboard · Chat · Knowledge · … · Production Polish). **[F10.3]** No code until Stage 2 + 3
are approved. **[F10.4]** Every stage references this spec; conflicts resolve in favor of this spec.

## §F11. Traceability

**[F11.1]** Design requirements trace: D1/D2/D3/D4 → this spec (§F4/§F5) → Stage 2 (how) → Stage 3 (where) →
implementation stages (what) → tests (§F6). **[F11.2]** Backend contract trace: `API_SPEC.md` → Stage 2 Data
Layer (§4) & API Integration (D4 §6) → feature data hooks. **[F11.3]** A final frontend traceability matrix is
produced at the end of implementation (analog of the backend's).

---

**Authority:** FRONTEND_MASTER_SPEC (this) > Stage-2 Architecture > Stage-3 Technical Spec > code. ONYX v1.0
and the backend contract are frozen inputs. Next: **Stage 2 — Frontend Architecture & Engineering
Specification** (`webplatform/frontend/STAGE2_ARCHITECTURE_PLAN.md`), then STOP for approval.
