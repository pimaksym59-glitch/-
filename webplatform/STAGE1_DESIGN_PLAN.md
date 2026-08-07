# WEB PLATFORM — Stage 1 Design Plan (UX/UI Concept · IA · Design System · Screens)

**Track:** New project — Web Platform on top of the completed core. **This is a PLAN, not the design and not
code.** After approval, subsequent steps produce the actual design artifacts. **Nothing here changes `app/`,
public Protocols, or `MASTER_SPEC.md` — Architecture Freeze & Production Code Freeze remain ACTIVE.**

Working names (to confirm): **product/web console = "Console"**, **design system = "ONYX"** (dark-first,
premium, luxury). Reference bar: ChatGPT · Claude · Notion · Linear · Vercel · Apple HIG.

---

## 0. Relationship to the frozen core (hard boundary)

- The web platform is a **separate track / separate directory** (`webplatform/`). It **consumes** the core
  only through its **public surfaces**: `/api/v1` (contract `API_SPEC.md`), `app.services.*` builders, public
  DTO/Protocol. It never imports domain internals and never modifies `app/`.
- All domain subsystems (AI Engine, Memory, RAG, Validation, Image Engine, Telegram Engine, Analytics, Admin,
  Provider Layer) are treated as **done** and integrated behind the existing API/RBAC (§R10.5) — the web UI is
  a **client**, exactly as §R10.1 already mandates ("panel = services/api client").
- Backend runtime remains **Runtime Verification Pending** (RV-9 etc.); the design assumes the documented API
  contract and gracefully handles gated/unavailable data (§R10.3).

## 1. Stage-1 scope (what this stage will deliver, after approval)

A complete, developer-ready **UX/UI concept** — no code — comprising four deliverables:

1. **D1 — Foundations & Concept:** product vision, design principles, information architecture, navigation
   model, primary user flows.
2. **D2 — Design System (ONYX):** design tokens, color, typography, spacing, grid, elevation/shadow, radius,
   glass/blur/depth, motion, and the full component library spec (buttons → activity feed).
3. **D3 — Screen Maps:** every screen — purpose, structure, layout, actions, UX decisions, states
   (empty/loading/error), responsive behavior, inter-screen transitions.
4. **D4 — FULL UI SPECIFICATION (handoff):** consolidated spec a frontend engineer can build from directly,
   plus accessibility and responsive rule sets.

Out of scope for Stage 1: any code, real assets/illustrations production, backend changes, clickable
prototype (optional later step, see §8).

## 2. Design direction (proposed — please confirm or steer)

| Axis | Proposed direction | Alternatives to consider |
|---|---|---|
| Theme | **Dark-first**, with a first-class light theme derived from the same tokens | dark-only |
| Aesthetic | Premium · minimal · modern · **AI-first** · enterprise-ready; generous whitespace | denser "power-user" mode |
| Glass | **Very moderate** — hairline borders + subtle backdrop-blur on overlays/topbar only | none / heavier glass |
| Accent | Single refined accent (**Iris/Indigo**) + a sparingly-used "aurora" gradient for AI moments | teal, violet, monochrome + one accent |
| Type | **Inter/SF-class** grotesque for UI + mono for code; large, confident type scale | a display face for headings |
| Density | Comfortable default + optional compact density token | — |
| Motion | Calm, physical, 120–320ms; reduced-motion first-class | more expressive |

I will proceed with the "Proposed" column unless you choose otherwise on approval.

## 3. Information Architecture (top-level map to be detailed in D1)

Two top-level surfaces sharing one shell:

- **Workspace (creator surface):** Dashboard · AI Chat (+ Chat History) · Knowledge Base · Memory · Image
  Studio · Prompt Library · AI Playground · Analytics · Telegram Bots.
- **Admin & Platform (governance surface, RBAC-gated §R10.5):** Admin Panel · Providers · Health · Jobs ·
  Logs · Audit · Feature Flags · Billing · Notifications.
- **Account & Content:** Landing · Login · Register · Settings · User Profile · Documentation.

Global objects: **Command Palette** (⌘K), global **Search**, **Notifications**, workspace/channel switcher.

## 4. Screen inventory (25 — mapped in D3)

Landing · Login · Register · Dashboard · AI Chat · Chat History · Knowledge Base · Memory · Image Studio ·
Prompt Library · AI Playground · Analytics · Telegram Bots · Providers · Settings · Billing · Notifications ·
User Profile · Admin Panel · Health Dashboard · Jobs Dashboard · Logs · Audit · Feature Flags · Documentation.

Each will be specified with: **purpose · structure · element placement · user actions · UX decisions ·
mobile behavior · inter-screen interactions · empty/loading/error states**.

## 5. Design system component inventory (spec'd in D2)

Buttons · Cards · Inputs · Tables · Tabs · Sidebar · Topbar · Breadcrumbs · Dialogs · Dropdowns · Toasts ·
Context Menu · Command Palette · Chat Components · AI Response Cards · Markdown Renderer · Code Blocks ·
Charts · Metrics Cards · File Upload · Avatar · Timeline · Activity Feed.

Each component: **anatomy · variants · sizes · states (default/hover/active/focus/disabled/loading) · tokens
used · a11y · motion · usage rules**.

## 6. Foundations to be specified (the 20 requested topics → mapped to deliverables)

1 Information Architecture (D1) · 2 Navigation (D1) · 3 User Flow (D1) · 4 Screen Maps (D3) · 5 Layout
systems (D2) · 6 Grid (D2) · 7 Color system (D2) · 8 Typography (D2) · 9 Design Tokens (D2) · 10 Components
(D2) · 11 Animations (D2) · 12 Micro-interactions (D2) · 13 Empty States (D3) · 14 Loading States (D3) ·
15 Error States (D3) · 16 Mobile UX (D3) · 17 Tablet UX (D3) · 18 Desktop UX (D3) · 19 Accessibility (D4) ·
20 Responsive rules (D4). Plus the "recommendations" set (color/shadow/radius/spacing/motion/glass/blur/
depth/hover/transitions) consolidated in **D2 tokens** and **D4**.

## 7. Execution sequence (Stage-1 sub-steps, each stops for nothing until D-set complete)

| Step | Produces | Completion criteria |
|---|---|---|
| S1.1 | D1 Foundations & Concept (`webplatform/design/01-foundations.md`) | principles, IA, nav, flows complete & internally consistent |
| S1.2 | D2 Design System / ONYX (`.../02-design-system.md`) | tokens (color/type/space/radius/shadow/motion/glass) + all 24 components spec'd |
| S1.3 | D3 Screen Maps (`.../03-screens.md`) | all 25 screens spec'd with states + responsive + transitions |
| S1.4 | D4 FULL UI SPECIFICATION (`.../04-ui-specification.md`) | consolidated handoff + a11y + responsive rules; ready for a frontend dev |
| S1.5 | Index + review (`webplatform/design/README.md`) | cross-links; self-review; consistency pass |

(Deterministic, offline, documentation-only. No `app/` changes. Optional visual artifact — see §8.)

## 8. Options for you to decide on approval

1. **Product/design-system names:** keep "Console" / "ONYX", or provide your own.
2. **Theme scope:** dark-first + light (recommended) vs dark-only.
3. **Accent color:** Iris/Indigo (recommended) vs teal / violet / other.
4. **Typeface intent:** Inter/SF-class (safe, licensable) vs a specific brand face you own.
5. **Density:** comfortable default (recommended) vs compact-first.
6. **Deliverable depth:** full four-document set (recommended) vs a condensed single spec first.
7. **Optional extra:** after the written spec, should I also build a **non-production visual style-tile /
   design-system preview** as a self-contained Artifact (HTML preview of tokens/components, not app code) so
   you can *see* the system? Yes/No. (This is a preview artifact, not the product's frontend code.)
8. **Platform priority order:** Desktop-first (recommended for an enterprise console) with responsive down to
   tablet/mobile — confirm.

## 9. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Scope creep into code / `app/` | Stage 1 is docs-only; new track dir; Freezes explicit |
| R2 | Design assumes API not yet runtime-verified | design to the `API_SPEC.md` contract; gated data handled per §R10.3 |
| R3 | Over-designed screens vs "no cluttered screens" goal | enforce whitespace/empty-state discipline in D2/D3 |
| R4 | Font/licensing | default to licensable Inter/SF-class stack unless you supply a brand face |
| R5 | Direction misalignment | this plan front-loads the §2/§8 decisions before production |

## 10. What I will NOT do in Stage 1

No code (HTML/CSS/JS/React), no changes to `app/` / public Protocols / `MASTER_SPEC.md`, no backend work, no
real deployment, no asset production. Purely the UX/UI concept, IA, design system, and screen structure.

---

**STOP — awaiting approval.** On your go-ahead (and answers to §8), I produce D1→D4 in sequence per §7. To
begin implementation of the actual UI code later, that becomes a separate, explicitly-approved stage of this
new track.
