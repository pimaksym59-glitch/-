# Console — D2: Design System (ONYX)

**Design System:** ONYX · **Deliverable D2 of Stage-1.** Project documentation only — **no code.** Tokens are
expressed as *values* (hex/px/ms), which is specification, not implementation. Dark-first with an **equal-
weight Light theme**. Accent = Iris/Indigo; **Aurora gradient is reserved exclusively for genuine AI moments**
(never decorative, never neon). Reference bar: Linear · Notion · Vercel · Stripe · OpenAI · Apple HIG.

Extends D1 (Foundations). Screens → **D3**; handoff → **D4**; visual preview artifact → after D4.

---

## 0. Token architecture (three tiers — the extensibility foundation)

ONYX uses a **3-tier token model** so the platform can grow (new AI providers, modules, workspaces) without
reworking the system:

1. **Primitive tokens** — raw scales, theme-agnostic: `color.neutral.900`, `space.4`, `radius.lg`,
   `duration.base`. Never used directly in components.
2. **Semantic tokens** — meaning, theme-aware: `surface.base`, `text.primary`, `border.subtle`,
   `interactive.default`, `ai.accent`, `status.success.fg`. **Components consume only these.**
3. **Component tokens** — optional per-component overrides that still reference semantics:
   `button.primary.bg → interactive.default`.

**Rule:** a new provider/module/theme is added by mapping *semantic* tokens — components never change. Themes
(dark/light/high-contrast/future brands) are just different primitive→semantic maps.

---

## 1. Color — primitive ramps

### 1.1 Neutral (cool-tinted ink)

| Token | Hex | Token | Hex |
|---|---|---|---|
| neutral.0 | `#FFFFFF` | neutral.700 | `#33383F` |
| neutral.25 | `#FAFBFC` | neutral.750 | `#282C32` |
| neutral.50 | `#F4F6F8` | neutral.800 | `#1E2127` |
| neutral.100 | `#ECEEF2` | neutral.850 | `#181A1F` |
| neutral.200 | `#DCE0E6` | neutral.900 | `#131519` |
| neutral.300 | `#C2C8D0` | neutral.950 | `#0E1013` |
| neutral.400 | `#9BA3AE` | neutral.975 | `#0A0B0D` |
| neutral.500 | `#6B7280` | neutral.1000 | `#060708` |
| neutral.600 | `#4A515C` |  |  |

### 1.2 Iris / Indigo (accent)

| Token | Hex | Notes |
|---|---|---|
| iris.50 | `#EEF0FF` | tint (light theme wash) |
| iris.100 | `#E0E3FF` |  |
| iris.200 | `#C7CCFF` |  |
| iris.300 | `#A7ADFF` | focus ring (dark) |
| iris.400 | `#8B8FFF` | hover (dark) |
| iris.500 | `#6E5BFF` | **primary accent** |
| iris.600 | `#5A46F0` | active / primary (light) |
| iris.700 | `#4A38CC` |  |
| iris.800 | `#3A2CA0` |  |
| iris.900 | `#2C2178` |  |

### 1.3 Aurora (AI-only) & functional hues

- **Aurora gradient (AI moments only):** `linear-gradient(100deg, #6E5BFF 0%, #9A6BFF 48%, #4FD1E0 100%)`.
  Usage: streaming shimmer, generation states, the AI presence marker. Always ≤ 12% opacity as a wash, or as a
  1–2px animated edge. **Never** as a full button/background fill; never neon-bright.
- **Success (green):** 500 `#2FBF71` · fg-on-dark `#4FD08A` · light `#128A54` · wash `#E6F6EE`.
- **Warning (amber):** 500 `#E5A94E` · light `#B5760A` · wash `#FBF0DD`.
- **Danger (red):** 500 `#E5555F` · fg-on-dark `#FF7A82` · light `#C4383F` · wash `#FBE5E7`.
- **Info (blue):** 500 `#5B9DF9` · light `#1F6FE0` · wash `#E6F0FE`.

All functional hues are **muted/refined**, tuned to pass AA on their paired backgrounds (see §2).

### 1.4 Data-viz categorical palette (harmonized, colorblind-aware)

`viz.1 #6E5BFF` (iris) · `viz.2 #4FD1E0` (cyan) · `viz.3 #34C77B` (green) · `viz.4 #E5A94E` (amber) ·
`viz.5 #F2779A` (rose) · `viz.6 #9A6BFF` (violet) · `viz.7 #5B9DF9` (blue) · `viz.8 #7C8698` (neutral). Order
is fixed for consistency across charts. Sequential/diverging ramps derive from iris & cyan (defined in §12).

---

## 2. Semantic color tokens (theme-aware — components use these)

Values given as **Dark / Light**. AA verified for text pairs.

| Semantic token | Dark | Light | Use |
|---|---|---|---|
| **background.canvas** | `#0A0B0D` | `#FAFBFC` | app backdrop |
| **background.sunken** | `#060708` | `#F0F2F5` | wells, code bg |
| **surface.base** | `#0E1013` | `#FFFFFF` | primary cards/panels |
| **surface.raised** | `#131519` | `#FFFFFF` | raised cards |
| **surface.overlay** | `#181A1F` | `#FFFFFF` | popovers/menus |
| **surface.inset** | `#181A1F` | `#F4F6F8` | inputs |
| **border.subtle** | `#1E2127` | `#ECEEF2` | hairline dividers |
| **border.default** | `#282C32` | `#DCE0E6` | card/input borders |
| **border.strong** | `#33383F` | `#C2C8D0` | emphasis / focus base |
| **text.primary** | `#F4F6F8` | `#131519` | headings/body |
| **text.secondary** | `#9BA3AE` | `#4A515C` | supporting |
| **text.tertiary** | `#6B7280` | `#6B7280` | hints/meta |
| **text.disabled** | `#4A515C` | `#9BA3AE` | disabled |
| **text.onAccent** | `#FFFFFF` | `#FFFFFF` | text on iris |
| **interactive.default** | `#6E5BFF` | `#5A46F0` | primary action |
| **interactive.hover** | `#8172FF` | `#6E5BFF` | hover |
| **interactive.active** | `#5A46F0` | `#4A38CC` | pressed |
| **interactive.subtle** | `rgba(110,91,255,.12)` | `rgba(90,70,240,.10)` | tinted bg |
| **focus.ring** | `#A7ADFF` | `#5A46F0` | focus outline |
| **selection.bg** | `rgba(110,91,255,.28)` | `rgba(90,70,240,.18)` | text selection / row select |
| **ai.accent** | `#8B8FFF` | `#6E5BFF` | AI presence marker |
| **ai.wash** | `rgba(110,91,255,.10)` | `rgba(110,91,255,.06)` | AI surface tint |
| **status.success.fg / bg** | `#4FD08A` / `rgba(47,191,113,.14)` | `#128A54` / `#E6F6EE` | success |
| **status.warning.fg / bg** | `#E5A94E` / `rgba(229,169,78,.14)` | `#B5760A` / `#FBF0DD` | warning |
| **status.danger.fg / bg** | `#FF7A82` / `rgba(229,85,95,.14)` | `#C4383F` / `#FBE5E7` | danger |
| **status.info.fg / bg** | `#5B9DF9` / `rgba(91,157,249,.14)` | `#1F6FE0` / `#E6F0FE` | info |

**Never rely on color alone** — every status also carries an icon + text (§11/§13).

---

## 3. Typography

**UI:** `Inter` → fallback `-apple-system, "SF Pro Text", "Segoe UI", system-ui`. **Mono:** `JetBrains Mono`
→ fallback `"SF Mono", ui-monospace, Menlo`. Features: `cv05, cv08, ss03` (Inter) for a refined, Linear/Vercel-
grade look; tabular figures (`tnum`) in tables/metrics.

### 3.1 Type scale (comfortable default)

| Token | Size / Line | Weight | Tracking | Use |
|---|---|---|---|---|
| display.lg | 40 / 48 | 600 | −0.02em | landing hero |
| display | 32 / 40 | 600 | −0.02em | page hero |
| h1 | 28 / 36 | 600 | −0.015em | screen title |
| h2 | 24 / 32 | 600 | −0.01em | section |
| h3 | 20 / 28 | 600 | −0.01em | subsection |
| h4 | 18 / 26 | 600 | −0.005em | card title |
| body.lg | 16 / 26 | 400 | 0 | chat, docs, reading |
| **body** (base) | 14 / 22 | 400 | 0 | default UI text |
| body.medium | 14 / 22 | 500 | 0 | emphasis |
| body.sm | 13 / 20 | 400 | 0 | dense UI, table cells |
| caption | 12 / 16 | 500 | 0.01em | meta, timestamps |
| overline | 11 / 14 | 600 | 0.06em UPPER | labels/section eyebrows |
| code | 13 / 20 | 400 (mono) | 0 | inline & block code |

**Weights:** 400 regular · 500 medium · 600 semibold · 700 bold (sparingly). **Reading measure:** chat/docs
body max-width ~72ch. **Compact mode** shifts base to 13/20 and reduces headings one notch.

---

## 4. Spacing, sizing & density

**Base unit 4px; 8px rhythm.** Scale: `space.0=0, .0.5=2, .1=4, .1.5=6, .2=8, .3=12, .4=16, .5=20, .6=24,
.8=32, .10=40, .12=48, .16=64, .20=80, .24=96, .32=128`.

- **Component paddings (comfortable):** button 10×16, input 10×12, card 20–24, list row 12×16, section gap 24–
  32, page margin 32–48.
- **Compact mode** (user setting, `⌘⇧D`): subtract one step from paddings; row height 44→36; base type 14→13.
- **Control heights:** sm 28 · md 36 (default) · lg 44. Touch targets ≥ 44px on tablet/mobile regardless of
  density.

---

## 5. Grid & layout

- **Breakpoints:** `xs <640` (mobile) · `sm 640` · `md 768` (tablet) · `lg 1024` · `xl 1280` (desktop base) ·
  `2xl 1536` (wide).
- **Shell dimensions:** sidebar 264 (expanded) / 64 (rail); topbar 56; right drawer 360–420; content max
  measure 1200 (dashboards) / 820 (reading & chat) centered with fluid gutters.
- **Grid:** 12-col fluid, 24px gutter (desktop) / 16px (tablet) / 16px 4-col (mobile). Cards snap to 4/6/12
  spans. Everything aligns to the 8px baseline.
- **Whitespace discipline (D1 principle):** one primary column, generous gutters; secondary detail goes to the
  right drawer, not a second dense column.

---

## 6. Radius

`radius.xs 4 · sm 6 · md 8 · lg 10 · xl 12 · 2xl 16 · 3xl 20 · pill 9999`. Usage: inputs/buttons `md`; cards
`xl`; menus/popovers `lg`; modals/sheets `2xl`; badges/avatars/pills `pill`; media thumbnails `lg`. One radius
family everywhere — no mixed corner logic.

---

## 7. Elevation system (Flat → Modal)

Five depth levels with unified shadow + surface + blur rules. Dark shadows are low-opacity, layered; light
shadows are soft neutral. Glass (backdrop-blur) appears **only** from Floating upward, and stays subtle.

| Level | Use | Surface (D/L) | Shadow (dark) | Shadow (light) | Blur | Border |
|---|---|---|---|---|---|---|
| **Flat** | page sections, table rows | base / #FFF | none | none | — | border.subtle |
| **Raised** | cards, panels | raised / #FFF | `0 1px 2px rgba(0,0,0,.5)` | `0 1px 2px rgba(16,24,40,.06)` | — | border.default |
| **Floating** | dropdowns, popovers, tooltips | overlay / #FFF | `0 8px 24px rgba(0,0,0,.55)` | `0 8px 24px rgba(16,24,40,.10)` | 16px | border.default + top highlight |
| **Overlay** | drawers, command palette | overlay / #FFF | `0 16px 48px rgba(0,0,0,.6)` | `0 16px 48px rgba(16,24,40,.14)` | 24px | border.default |
| **Modal** | dialogs, critical sheets | overlay / #FFF | `0 24px 64px rgba(0,0,0,.65)` | `0 24px 64px rgba(16,24,40,.18)` | 32px | border.strong |

**Scrim** (Overlay/Modal): dark `rgba(6,7,8,.64)`, light `rgba(16,24,40,.40)`, fades in 180ms. **Top
highlight** (glass): a 1px inner line at `rgba(255,255,255,.06)` (dark) to give a premium edge. Depth is
communicated by **surface step + shadow**, not by heavy borders.

---

## 8. Glass, blur & depth rules

- **Very moderate glass.** Glass = `backdrop-blur` + low-opacity surface fill + hairline border + 1px top
  highlight. Applied to: topbar (on scroll), command palette, drawers, dialogs, menus. **Not** on cards or
  content.
- **Fill opacity:** dark `rgba(14,16,19,.72)`, light `rgba(255,255,255,.72)`. Blur per elevation (§7).
- **Depth cues (in order of preference):** surface lightness step → shadow → subtle scale/parallax on enter.
  Avoid stacking many glass layers (max 2 concurrent). Respect performance: blur only on overlay chrome.

---

## 9. Motion system

**Durations:** `instant 80 · fast 120 · base 180 · moderate 240 · slow 320 · slower 480 (rare)`.
**Easing:** `standard cubic-bezier(.2,0,0,1)` · `entrance/decelerate cubic-bezier(.05,.7,.1,1)` ·
`exit/accelerate cubic-bezier(.3,0,.8,.15)` · `emphasized cubic-bezier(.2,0,0,1)` (for hero/AI).

- **Enter/exit:** enter = fade + 8px rise, `entrance`, base–moderate; exit = fade + shrink 2%, `exit`, fast.
  Popovers scale from 0.98→1 with origin at the trigger.
- **Page transitions:** cross-fade + 8px horizontal slide, 240ms `standard`; preserve scroll where sensible;
  never a full white flash (theme-correct background throughout).
- **Streaming animations:** each token/word fades in 80ms; a soft **Iris caret** pulses (900ms) at the write
  head; on true generation, a 1px **Aurora edge** sweeps the message container once (moderate), then rests. No
  spinners on AI surfaces.
- **Skeletons:** low-contrast blocks with a **shimmer sweep** (1200ms linear loop, ±4% luminance); shapes match
  final content (text lines, avatar circle, card). Replace, don't overlay.
- **Micro-interactions:** hover 120ms tint/lift; press 80ms scale 0.98; toggle/checkbox 180ms with a tiny
  spring; success check draws in 240ms.
- **Reduced-motion (`prefers-reduced-motion`):** disable movement/parallax/shimmer/aurora-sweep → use opacity
  fades only; streaming caret becomes a static block; skeletons become a static muted fill. All meaning is
  preserved without motion.

---

## 10. Iconography

- **One family, one style:** a single **outline / stroke** set (Lucide-grade), 1.5px stroke, 24px design grid,
  rounded joins/caps, geometric-humanist to match Inter. **Never mix** filled + outline, or two icon libraries.
- **Sizes:** 16 (inline/labels) · 20 (buttons/nav default) · 24 (feature/empty-state) · 32–40 (illustrative,
  monochrome). Optical alignment to text baseline; icon color = current text token, not hard-coded.
- **Status/semantic icons are fixed** (consistency): success = check-circle, warning = triangle-alert, danger =
  octagon-alert, info = info-circle, AI = sparkle, loading = spinner (non-AI), streaming = caret/waveform,
  verified = badge-check, gated = lock.
- **Do:** monochrome, currentColor, consistent weight. **Don't:** multicolor icons, drop-shadows on icons,
  decorative neon.

---

## 11. Status language (single vocabulary — no cross-screen drift)

Every state has one canonical **label · color token · icon · shape (badge)**. Used identically on Dashboard,
Jobs, Chat, Studio, Analytics, Content.

| Status | Token | Icon | Meaning | Badge style |
|---|---|---|---|---|
| **Loading** | text.tertiary | spinner | fetching (non-AI) | ghost, animated |
| **Streaming** | ai.accent | caret/waveform | AI producing output now | soft, Aurora edge |
| **Queued** | text.secondary | clock | accepted, awaiting run | subtle |
| **Running** | status.info | activity | executing | info, animated dot |
| **Completed** | status.success | check-circle | finished OK | success |
| **Failed** | status.danger | octagon-alert | errored | danger |
| **Needs Review** | status.warning | flag | ambiguous/blocked → human (§R7.4/§R8.4) | warning, prominent |
| **Verified** | status.success | badge-check | passed checks (validation/image) | success, outline |
| **Draft** | text.secondary | pencil | not yet scheduled | neutral outline |
| **Published** | status.success | send | live on channel | success solid-dot |
| **Scheduled** | status.info | calendar-clock | queued for a slot | info |
| **Paused** | text.tertiary | pause | temporarily halted | muted |

Rule: the same status **always** looks and reads the same everywhere. New states are added here first, then
used.

---

## 12. Data visualization

- **Charts:** minimal, axis-light. Grid lines `border.subtle`; one categorical order (§1.4); line 2px; area
  fills 8–14% opacity; points appear on hover only. Tooltips = Floating elevation, tabular figures, unit-
  labeled. Sequential ramp: iris.100→iris.700; diverging: cyan↔iris around a neutral midpoint. Max ~6 series;
  beyond that, aggregate. Always a title, a time-range chip, and a legend that doubles as a toggle.
- **KPI / Metric cards:** big value (tnum, h2/h1 weight), label (overline), delta chip (▲/▼ + %, colored by
  good/bad *semantics* not raw sign), sparkline (optional), and a source/time whisper. Never a bare number
  without context.
- **Tables:** see §14 (Tables). For analytics tables: right-align numbers, tabular figures, sticky header,
  zebra off by default (use hairlines), inline mini-bars for magnitude.
- **Status badges:** exactly the §11 vocabulary; pill shape, `caption` size, icon+label, semantic bg/fg.
- **Health indicators:** a calm dot system — green (healthy), amber (degraded), red (down), grey (unknown/
  gated). Dot + label; a probe list shows name · state · detail. Never a scary all-red wall; group and
  summarize.
- **Analytics rules (§R10.3/§R11):** *reliable panels first* (Cost/Quality/System/Diversity). Engagement panels
  render as a **"Gated"** empty-state card (lock icon + "Requires a stats adapter" + learn-more) — **never**
  fabricated values. Every computed panel shows a provenance whisper (source · filters · algorithm version ·
  time, §R11.9).

---

## 13. Component library (24 core components)

Each: **anatomy · variants · sizes · states · tokens · a11y · motion.** States set = `default · hover ·
active · focus-visible · disabled · loading` unless noted.

**1. Buttons** — anatomy: [icon?] label [icon?]. Variants: *primary* (interactive.default, text.onAccent),
*secondary* (surface.raised + border.default), *ghost* (transparent, hover interactive.subtle), *danger*
(status.danger), *AI* (Aurora 1px edge + ai.wash, for generate/ask). Sizes sm28/md36/lg44; icon-only square.
States incl. loading (spinner replaces icon, label stays, control disabled). A11y: real button role, label or
aria-label, focus.ring 2px offset 2. Motion: hover 120ms tint, press 80ms scale .98.

**2. Cards** — Raised elevation, radius.xl, padding 20–24. Slots: header (title h4 + actions), body, footer.
Variants: static, interactive (hover lift + border.strong), selectable (selection.bg + check), metric (§12).
A11y: interactive cards are buttons/links with focus ring. Motion: hover lift 1px + shadow step, 120ms.

**3. Inputs** (text/textarea/number/search) — surface.inset, border.default, radius.md, height md. Slots:
leading icon, value, trailing (clear/unit/action), helper/error text below. States add *invalid* (border+text
danger), *filled*, *readonly*. Search variant integrates ⌘K hint. A11y: label always (visible or aria),
`aria-invalid`, `aria-describedby` for helper/error. Motion: focus ring fade 120ms; error shake off by default
(reduced-motion safe).

**4. Select / Combobox / Dropdown-field** — trigger like input + chevron; menu = Floating elevation, keyboard
navigable (`↑↓`, type-ahead, `↵`, `esc`), multi-select with chips. Async/searchable variant with inline
loading row. A11y: `listbox`/`combobox` semantics, active-descendant, announced selection.

**5. Tables** — sticky header (overline labels), rows 44 (comfortable)/36 (compact), hairline dividers, right-
aligned numerics (tnum). Features: sort, column show/hide, row select (`x`, `⌘a`), bulk action bar (appears on
selection), row hover reveals actions, expandable rows (detail without navigation), pagination or virtualized
infinite scroll, sticky first column on mobile. Empty/loading/error per §15–16. A11y: real table semantics,
sortable headers announce state, keyboard row nav (`j/k`, `↵`).

**6. Tabs** — underline style (2px iris indicator that slides), overline/body labels, optional count badges.
Overflow → scroll or "more" menu. A11y: `tablist`/`tab`/`tabpanel`, arrow-key nav, `aria-selected`. Motion:
indicator slides 180ms standard.

**7. Sidebar** — expanded 264 / rail 64; grouped nav (Workspace/Platform/Account); item = icon+label+status
dot; active = 2px iris left-marker + interactive.subtle. Collapsible (`⌘\`), state persists. Tablet → rail;
mobile → bottom tabs + sheet (D3). A11y: `nav` landmark, current = `aria-current`, tooltips on rail.

**8. Topbar** — 56px, Flat→glass on scroll; left channel switcher + breadcrumb, right search(⌘K)/bell/avatar.
A11y: landmark `banner`, all controls keyboardable.

**9. Breadcrumbs** — ≤3 crumbs, chevron separators, last = current (not a link), truncation with tooltip.
A11y: `nav aria-label="Breadcrumb"`, `aria-current="page"`.

**10. Dialogs / Modals** — Modal elevation, radius.2xl, max-width 480 (confirm)/640 (form)/960 (rich), scrim,
focus-trap, `esc` to close, primary+secondary footer, destructive variant separates the danger action. A11y:
`role="dialog" aria-modal`, labelled title, focus returns to trigger. Motion: scrim 180ms + panel scale
.98→1 240ms entrance.

**11. Dropdowns / Menus** — Floating, radius.lg, item rows with icon+label+shortcut+trailing state, sections
with overline dividers, destructive item in danger, submenu on hover/`→`. A11y: `menu`/`menuitem`, roving
focus, type-ahead, shortcut hints announced.

**12. Toasts** — bottom-right stack (top on mobile), Floating, 4 kinds (success/info/warning/danger) + AI kind
(Aurora edge), auto-dismiss 4–6s (persist on hover/focus), optional action + close, max 3 stacked then collapse.
A11y: `role="status"`(polite) / `alert`(danger), never the only signal for critical outcomes. Motion: slide+
fade in 240ms entrance, out fast.

**13. Context menu** (right-click / `⋯`) — same visual language as Menus; contextual to the row/entity; RBAC-
aware (hides forbidden actions). A11y: keyboardable via the `⋯` trigger too.

**14. Command Palette** — Overlay+glass, centered, 640 wide; input with mode hints (`> @ # /`), grouped
results with icons + breadcrumb + shortcut, live preview pane (optional), recents. Fully keyboard-driven,
RBAC-filtered (D1 §6.4). A11y: `combobox`+`listbox`, announced result counts, `esc` closes and restores focus.
Motion: overlay 180ms, results reflow without jank.

**15. Chat components** — see §14-AI (Streaming Message, composer, message list). Composer: growable textarea,
attach, model/route selector, send (⌘↵), stop; sticky bottom; token/cost whisper.

**16. AI Response Cards** — a message-embedded card for structured AI output (a draft post, an analysis, a plan):
header (type + model whisper), body (Markdown), action row (copy, retry, branch, insert-to-channel, cite),
optional verification badges. Aurora edge only while streaming.

**17. Markdown renderer** — reading-grade: body.lg, 72ch measure, styled headings/lists/quotes/tables/links,
inline code chips, task lists, callouts (info/warn/success/AI) mapped to status tokens, images with rounded
frames, footnote-style citations that open the source drawer. Safe/sanitized.

**18. Code blocks** — JetBrains Mono 13/20, background.sunken, radius.lg, header (language + copy button),
line numbers (toggle), soft syntax theme derived from viz palette (low-saturation, AA), horizontal scroll in
its own container, diff mode (add/remove tinted with success/danger washes). Copy → toast.

**19. Charts** — per §12; components: Line, Area, Bar, Sparkline, Donut (sparingly), Heatmap. Responsive,
tooltip on hover/focus, keyboard-focusable data points, empty/loading skeleton (axis + shimmer).

**20. Metric cards** — per §12; sizes sm (inline KPI) / md (dashboard tile) / lg (hero stat). Delta semantics
(good/bad, not sign), sparkline optional, source whisper, click → drill to Analytics.

**21. File upload** — dropzone (dashed border.strong, icon, "drag or browse"), list of files with per-file
progress (streaming), type/size validation with inline errors, retry/remove, success = Verified chip. A11y:
input focusable, drop has a button equivalent, progress announced. Used by Knowledge & Image references.

**22. Avatar** — circle, sizes 20/24/32/40/64; image or initials (deterministic tint from a muted set, never
neon), presence dot optional, group/stack with "+N". A11y: alt/name, decorative when redundant.

**23. Timeline** — vertical connector + nodes; each node = icon (status token) + title + time + detail;
grouped by day; used for a post's pipeline history and version history. A11y: ordered list semantics, time in
`<time>`.

**24. Activity feed** — reverse-chron list of events (who · action · entity · time), typed icons, filters by
kind, links to entity, load-more/virtualized. Distinct from Audit (Audit is the formal record; feed is the
ambient stream). A11y: list semantics, live-region for new items (polite).

---

## 14. AI components (the pillar set)

Designed to feel like Claude/ChatGPT while wired to the pipeline. AI presence = Iris; **generation = brief
Aurora**, never neon.

- **Streaming Message** — assistant bubble that renders tokens progressively (80ms fade), Iris caret at the
  write head, 1px Aurora edge sweep at start, then rests. Sticky "Stop" (⌘⌫) while streaming; auto-scroll with
  a "jump to latest" pill if the user scrolled up. Model/route + cost/latency whisper under the message.
  Actions on hover/focus: copy, retry, branch (fork the conversation), insert-to-channel-as-draft, cite.
- **Thinking State** — pre-token state: a compact "Thinking…" row with an Aurora shimmer bar (not a spinner)
  and an optional expandable **reasoning/steps** disclosure when the backend exposes tool/plan steps. Reduced-
  motion → static "Thinking…" + dots.
- **Tool Call** — an inline card when the AI invokes a capability (retrieve knowledge, generate image, run
  validation): header (tool name + Running/Completed/Failed status §11), collapsible input/output summary,
  duration whisper. Read-only, provenance-forward.
- **Citation** — a small numbered chip `[1]` inline; hover = source preview popover; click = opens the
  Knowledge/Memory drawer at the exact chunk (channel-isolated, §R2.6). Builds trust in AI claims.
- **Memory Card** — surfaces a memory entry (scope, kind, style feature) with a "why this matters" line and a
  link to Memory Explorer; used inline in chat/compose and in the Memory pillar.
- **Knowledge Card** — a document/chunk preview (title, snippet with match highlight, source, retrieval score
  as a calm bar), actions: open, insert, exclude. Used in retrieval preview and citations.
- **Image Result** — generated image in a rounded frame with **calm verification chips** (Verified/Safety-ok/
  Unique-phash/Regen ×n, §R6), prompt disclosure, actions: accept, regenerate, attach-to-post, download. Batch
  = grid with per-image status.
- **Prompt Card** — a prompt/version summary (name, version, active badge, variables count, last edited), diff
  affordance, "Run in Playground" and "Promote to active" (guarded) actions.
- **Verification Badge** — the canonical badge-check for passed checks (validation gates, image safety/phash);
  outline success style; hover = which checks passed; ties to the §11 **Verified** status. Its counterpart
  **Needs Review** (warning/flag) is equally prominent for the at-least-once/ambiguous cases (§R7.4/§R8.4).

---

## 15. Empty states (required structure)

Every empty state contains **four parts**: (1) a short **explanation** of what lives here, (2) a **recommended
action** (what to do first), (3) a **primary CTA** (button, often AI-flavored), (4) an **entry to start
working** (secondary path / docs link / sample). Visual: centered, 24–32px monochrome icon, generous space, no
illustration clutter.

Examples (canonical copy tone):
- **Chat (no conversations):** "Start a conversation with your AI. Draft posts, refine ideas, or ask about a
  metric." · CTA **New chat** · secondary "Browse prompts."
- **Knowledge (empty):** "Teach the AI what you know. Add documents and it will use them, scoped to this
  channel." · CTA **Add source** · secondary "See how retrieval works."
- **Analytics (gated engagement):** "Engagement metrics need a stats adapter. Cost, quality, system and
  diversity are available now." · CTA **View available metrics** · secondary "Learn about gated data."
- **Jobs (no tasks):** "No jobs running. Scheduled work will appear here." · secondary "Open Scheduler."
- **Channels (none):** onboarding hero → **Create your first channel** (guided first-post, per D1 §7.1).

---

## 16. Loading & error states (patterns)

- **Loading:** prefer **skeletons** shaped like the final content (lists, cards, tables, chart axes) with the
  §9 shimmer; inline spinner only for small, bounded waits (button, row). AI surfaces use **Thinking/Streaming**
  states, never a blocking spinner. Perceived first paint < 400ms.
- **Errors:** three scopes — (a) **inline** (field/row: message + retry), (b) **section** (a card fails: compact
  error card with cause + retry, rest of page intact), (c) **page** (rare: full error state with cause,
  correlation id, retry, and a link to Health/Docs). Always specific, never "Something went wrong" alone;
  destructive/irreversible errors offer recovery guidance. Network/gated distinguished from real failures.
- **Success:** quiet — a toast + optimistic UI reconciliation; a drawn check (240ms) for meaningful completions.

---

## 17. Accessibility (WCAG 2.1 AA+, built-in)

- **Contrast:** text ≥ 4.5:1 (≥ 3:1 for ≥ 24px/semibold ≥ 19px); UI/graphics ≥ 3:1; both themes verified; a
  future **high-contrast** theme is just another primitive→semantic map.
- **Keyboard:** 100% operable without a mouse; logical tab order; visible `focus.ring` (2px, offset 2, AA on
  every surface); no keyboard traps except intended focus-traps (dialogs) that restore focus on close.
- **Screen readers:** semantic landmarks (banner/nav/main/complementary), labelled controls, `aria-current`,
  live regions — **streaming output** and **toasts** announced politely, **danger** assertively; icon-only
  buttons have `aria-label`.
- **Motion/contrast prefs:** honor `prefers-reduced-motion` (§9) and `prefers-contrast`.
- **Zoom/scaling:** usable at 200% zoom and up to 320px reflow width without loss of content/function; text
  uses relative units so OS text-scaling works.
- **Status never color-only** (§11); errors reference the field; forms give clear, associated messages.

---

## 18. Extensibility patterns (grow without reworking ONYX)

- **New AI provider:** appears wherever `providers` render via the existing Provider/Metric/Status tokens and
  the Providers/Playground components — no new component, just data + a provider avatar/tint from the muted set.
  Capabilities/health use the §11 status language.
- **New module / workspace surface:** add a sidebar group + routes; reuse shell, tokens, and the component
  library. A module contributes screens (D3 patterns) and, if needed, **new semantic status entries** (added to
  §11 first) — never new one-off styles.
- **New theme/brand:** define a primitive→semantic map (dark/light already ship); components are untouched.
- **New chart/metric type:** slot into the §12 rules and viz palette order.
- **New status:** register in §11 (label·color·icon·badge) once; it is then consistent everywhere.
- **Density/locale/RTL-ready:** spacing is tokenized; type uses relative units; layout is logical-property-
  friendly so RTL is a later flip, not a redesign.

---

## 19. Handoff notes for D3/D4

Components in this doc are the vocabulary; **D3** composes them into the 25 screens (layout, placement,
actions, states, responsive, transitions), and **D4** consolidates the buildable spec + the full accessibility
checklist + responsive rule tables + the token reference. The **Preview Artifact** (after D4) will visualize
tokens, the component gallery, and a style tile — a non-production demonstration, not product code.

---

**STOP — D2 complete. Awaiting your approval to proceed to D3 (Screen Maps: all 25 screens).**
