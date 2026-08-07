# `shared/ui` — the ONYX component library in code

**Contract:** D2 §13 (24 core components) + §14 (AI set) are the frozen source of truth for every
component's _anatomy · variants · sizes · states · tokens · a11y · motion_. This README fixes the
**component-API convention** (FS3 T-FS3.2). Anything not derivable from D2/Stage 3 is out of scope.

## API convention

1. **Semantic tokens only.** Styling uses the ONYX Tailwind utilities mapped in `styles/tokens.css`
   (`bg-raised`, `text-secondary`, `border-border-default`, `text-danger`, …) or `var(--…)` custom
   properties. **Never a raw hex/rgb.** Token _values_ are frozen — fix contrast by changing which token a
   call site uses, never by editing a token.
2. **Text tone is typed** (`tone.ts`): components rendering **small** text accept `SmallTextTone`
   (`'primary' | 'secondary'` — `tertiary` is unrepresentable); only ≥16px/decorative-meta slots accept
   `MetaTextTone`. This encodes the twice-violated D2 usage rule at compile time.
3. **Variants/sizes are string-literal unions** (`variant`, `size`, `kind`, `tone`), mapped through
   `Record<Union, string>` class maps — exhaustive by construction, no boolean prop sprawl.
4. **Props extend the native element** (`React.ButtonHTMLAttributes<…>` etc.) where the component wraps a
   single element; `className` is always merged last via `clsx` as the escape hatch; `ref` passes through as
   a regular prop (React 19) where consumers plausibly need it.
5. **State is exposed as `data-*` attributes** (`data-state`, `data-kind`, `data-invalid`, …) for styling
   and tests; interactive states follow the D2 set `default · hover · active · focus-visible · disabled ·
loading` (via CSS pseudo-classes, `disabled:` and explicit props for loading).
6. **Behavioural primitives come from Radix** where the Stage 3 §2 inventory says so — never re-implement
   focus traps, roving focus, `aria-*` wiring or dismissal. `cmdk` powers command/combobox listboxes.
7. **A11y is part of the component, not the call site:** labelled controls (`label`/`aria-label` required by
   types where the visual label is optional), `aria-invalid` + `aria-describedby` on fields, `role="status"`
   / live-region announcements through `useAnnouncer` for async outcomes, icon-only controls require
   `aria-label`, focus ring = `--focus-ring` 2px offset 2.
8. **Motion honours `prefers-reduced-motion`** — durations/eases come from motion tokens (`--ease-standard`,
   themes.css helpers); shimmer/Aurora collapse to static under reduced motion.
9. **Aurora / `ai` variants are for genuine AI moments only** (D2 §14) — never decoration.
10. **Heavy components are lazy:** `data-table`, `markdown`, `code-block`, `chart` must never enter a route's
    First Load bundle — consume them via their `lazy.ts` entrypoints (`next/dynamic`) or a route-level
    `dynamic()`. The `pnpm budget` gate enforces the outcome (≤180 kB per route).
11. **Public API = component entrypoints.** Each component directory exposes `index.ts` and is imported as
    `@/shared/ui/<component>` (the AI set as `@/shared/ui/ai`) — the same granularity `shared/lib` already
    uses (`@/shared/lib/api`, …). There is deliberately **no root barrel**: a full-library barrel put every
    component into every route's First Load (measured: 168 → 188 kB, over budget) because client-component
    re-export chains defeat tree-shaking. Deeper imports than the component `index.ts` are forbidden.
    Stories live next to the component (`<Name>.stories.tsx`), one per component, exercised in both themes ×
    both densities via the Storybook toolbar globals.
12. **Statuses come from the registry** (`shared/types/status.ts`). A new status is registered there first;
    `StatusBadge` renders any registered status — never a hand-rolled status chip.

## Layer rules

`shared/ui` imports only `shared/*` (never entities/features/widgets/app). No data fetching, no Query hooks,
no business logic — components accept props. AI components are presentational; streaming demos use the
deterministic FS1 relay, real wiring arrives with FS6+ features.
