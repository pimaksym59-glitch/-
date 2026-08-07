# Frontend ADR Decisions — Charts · Styling · Observability

**Date:** 2026-07-29 · **Status:** **ACCEPTED — decided by the owner** · **Scope:** closes the three "open
frontend ADRs" that Stage 2 §15 required decided **before FS3** (proposals were presented in
`FS2_REPORT.md` §8; the decision is the owner's, per the no-automatic-ADRs rule).

> **Naming note.** The owner labelled these decisions **ADR-FE-1…3**. They are distinct from the locked
> architecture register **FE-ADR-1…11** (Stage 2 §15), which remains unchanged. ADR-FE-1…3 *close the open
> questions* that register left for the owner; they do not modify any accepted FE-ADR.

---

## ADR-FE-1 — Chart library

**Decision:** **visx** is approved as the chart library.

- All heavy graphics modules load **only via `dynamic()`** — never in the initial route bundle.
- **No alternatives without a new ADR.**

**Consequences:** `visx` is installed at FS3 (the stage that needs it) under the declare + install +
import-check rule; Chart components (Line/Area/Bar/Sparkline/Donut/Heatmap, D2 §13.19 / §12) are built on visx
primitives with ONYX viz tokens; lazy loading protects the per-route First Load budget (FS2 §9 R1 — 12 KB
headroom).

## ADR-FE-2 — Styling depth

**Decision:** the current strategy is **kept: Tailwind CSS v4 + CSS Modules** (on ONYX tokens as CSS
variables, per FE-ADR-6).

- **CSS-in-JS is not to be used.**

**Consequences:** no migration work; the FS1/FS2 styling mechanism (tokens.css `@theme` map, `@layer base`,
CSS Modules escape hatch) continues unchanged through FS3–FS15.

## ADR-FE-3 — Observability vendor

**Decision:** implementation is **deferred to FS14/FS15**.

- Until then, only the architecturally provided **seams** exist (the provider-agnostic, PII/secret-scrubbed
  sink of Stage 2 §11); no vendor SDK is installed and no vendor contract is bound before FS14.

**Consequences:** the vendor choice (Sentry vs OpenTelemetry self-hosted vs other) is made at FS14/FS15 as
its own decision; early stages keep the sink seam intact and add nothing to it.

---

**Effect:** the Stage 2 §15 gating condition for FS3 is **satisfied**. Changing any of the three decisions
above now requires a new ADR (MAJOR discipline). Recorded in the handoff set (PART2 §4.1, PART4 §7.1).
