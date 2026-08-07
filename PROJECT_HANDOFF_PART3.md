# PROJECT_HANDOFF — PART 3 · Structure, Files, Technologies, Environment, Commands

*Read after PART2. Covers request items **4** (all implemented components), **7** (full project structure),
**8** (technologies, libraries, versions, dependencies), **9** (environment configuration), **10** (important
files and their purpose), **18** (all commands). Refreshed 2026-08-07 after the FS15 acceptance — **the
frontend implementation track is now COMPLETE (FS1–FS15, 15/15)**; size-limit UNCHANGED at 777 kB — measured
766.23 kB, re-confirmed with zero movement since FS15 shipped zero `src/` modules; **`/chat` remains
180 / 180 kB — ZERO headroom, held through FS14 by a measured refusal and through FS15 unconditionally**.
FS15 added one root-level file outside `webplatform/console/` (`webplatform/docker-compose.console.yml`) and
three files inside it (two scripts, one test) — see §2 and §3 below for exactly where.*

---

## 1. Repository structure — top level *(request item 7)*

```
C:\Users\Fupxrx\Desktop\projects\
├─ MASTER_SPEC.md  DATABASE_SPEC.md  API_SPEC.md  TEST_PLAN.md      # backend SoT + contracts
├─ TECHNICAL_BACKLOG.md  TRACEABILITY_STAGE2.md                     # living documents
├─ PROJECT_HANDOFF.md  PROJECT_HANDOFF_PART1..4.md                  # ← this handoff set
├─ HANDOFF.md  README.md  CHANGELOG.md  CONTRIBUTING.md  SECURITY.md  Makefile
├─ ARCHITECTURE_MAP.md  DEPENDENCY_MAP.md  MASTER_SPEC_TRACEABILITY_FINAL.md
│  PUBLIC_CONTRACT_REGISTRY.md  ADR_SUMMARY.md  RUNTIME_VERIFICATION_REGISTRY.md
│  PRODUCTION_READINESS_SUMMARY.md  PROJECT_COMPLETION_SUMMARY.md
├─ TASK_BREAKDOWN_STAGE{2..20}.md  STAGE{1..20}_REPORT.md
│  CODE_AUDIT_STAGE{1..20}.md  RELEASE_NOTES_STAGE{1..20}.md
├─ docker/{Dockerfile,Caddyfile,postgres/init.sql}  docker-compose.yml
├─ config/{global,development,production}.yaml
├─ .github/workflows/ci.yml  pyproject.toml  alembic.ini  .env(.example)
├─ docs/{README,TAXONOMY, architecture/, api/, developer/, operations/, deployment/,
│         security/, runbooks/, troubleshooting/, release/, support/, adr/, spec/}
├─ legacy/                                   # archived old build — DO NOT TOUCH
├─ app/     (256 .py, 27 packages)           # FROZEN backend source
├─ tests/   (131 .py)                        # mirrors app/ + framework/ + contract/ + e2e/
├─ .venv/                                    # Python 3.14.6
└─ webplatform/                              # FRONTEND TRACK — entirely untracked in git
```

## 2. `webplatform/` — the frontend track

```
webplatform/
├─ FRONTEND_MASTER_SPEC.md          # frontend Source of Truth (v1.0)
├─ FRONTEND_ARCHITECTURE_FREEZE.md  # the freeze record
├─ DESIGN_FREEZE_AND_ROADMAP.md     # design freeze + the plan→approve→implement method
├─ STAGE1_DESIGN_PLAN.md            # how the design phase was planned
├─ design/
│   ├─ 01-foundations.md            # D1 — vision, IA, navigation, flows, keyboard map
│   ├─ 02-design-system.md          # D2 — ONYX: tokens, 24 components, status vocabulary
│   ├─ 03-screens.md                # D3 — all 25 screen maps (Dashboard = §4)
│   ├─ 04-ui-specification.md       # D4 — buildable spec, §12 versioning, §13 evolution
│   └─ preview.html                 # published visual reference standard
├─ frontend/
│   ├─ STAGE2_ARCHITECTURE_PLAN.md  # Stage 2 — engineering architecture (frozen)
│   ├─ STAGE3_TECHNICAL_SPEC.md     # Stage 3 — file-level technical spec (frozen)
│   ├─ STAGE_FS1_PLAN.md · FS1_REPORT.md · FS1_POSTMORTEM.md
│   ├─ STAGE_FS2_PLAN.md · FS2_REPORT.md
│   ├─ FE_ADR_DECISIONS.md          # owner-decided ADR-FE-1…3 (visx · Tailwind+CSSM · obs deferred)
│   ├─ STAGE_FS3_PLAN.md · FS3_REPORT.md
│   ├─ STAGE_FS4_PLAN.md · FS4_REPORT.md
│   ├─ STAGE_FS5_PLAN.md · FS5_REPORT.md   # §11 = acceptance addendum (size-limit → 485 kB)
│   ├─ STAGE_FS6_PLAN.md · FS6_REPORT.md   # §11 = acceptance (size-limit → 560 kB)
│   ├─ FS6_REPORT_SIZE_ADDENDUM.md  # the dedicated bundle analysis behind the 560 ruling
│   ├─ STAGE_FS7_PLAN.md            # §3.1 rendering matrix · §3.2 invalidate graph · §3.3 no-touch set
│   ├─ FS7_REPORT.md                # §12 = acceptance (size-limit → 598 kB) + the honesty correction
│   ├─ FS7_REPORT_SIZE_ADDENDUM.md  # the dedicated bundle analysis behind the 598 ruling (§6 = ruling)
│   ├─ STAGE_FS8_PLAN.md            # + §3.4 ownership matrix · §3.5 navigation contract · §3.6 bundle
│   │                               #   ownership · §3.7 regression invariants I1–I8
│   ├─ FS8_REPORT.md                # §12 = acceptance (size-limit → 628 kB) + the evidence-pack correction
│   ├─ FS8_REPORT_SIZE_ADDENDUM.md  # the dedicated bundle analysis behind the 628 ruling (§6 = ruling)
│   ├─ STAGE_FS9_PLAN.md            # + D1–D8 contract findings (no image-create call, no media URL, no
│   │                               #   attach) · the same seven fixed sections · T-FS9.1 zero-commons
│   ├─ FS9_REPORT.md                # §12 = acceptance (size-limit → 655 kB) + the I2 rounding ruling
│   ├─ FS9_REPORT_SIZE_ADDENDUM.md  # the dedicated bundle analysis behind the 655 ruling (§6 = ruling)
│   ├─ STAGE_FS10_PLAN.md           # + D1–D10 contract findings (three calls only; no name/channel_id/
│   │                               #   is_active/variables) · the same seven fixed sections · T-FS10.1
│   ├─ FS10_REPORT.md               # §12 = acceptance (size-limit → 677 kB) + the I1 rounding ruling +
│   │                               #   §4 = the owner's requirements A (channel-free) and B (no
│   │                               #   cross-scope ownership), each proved
│   ├─ FS10_REPORT_SIZE_ADDENDUM.md # the dedicated bundle analysis behind the 677 ruling (§8 = ruling)
│   ├─ STAGE_FS11_PLAN.md           # + D1–D12 contract findings (five READ calls; no anomaly/forecast/
│   │                               #   recommendation/system/export endpoint) · the same seven fixed
│   │                               #   sections · T-FS11.1 zero-commons + the R1c first-consumer measurement
│   ├─ FS11_REPORT.md               # §12 = acceptance (size-limit → 696 kB) + the I2 re-partition ruling
│   │                               #   that fixed the post-FS11 standing reference numbers
│   ├─ FS11_REPORT_SIZE_ADDENDUM.md # the dedicated bundle analysis behind the 696 ruling (§6 = ruling)
│   ├─ STAGE_FS12_PLAN.md           # + D1–D15 contract findings (NO providers/logs/flags/notifications
│   │                               #   endpoint exists) · the same seven fixed sections · T-FS12.1 = the
│   │                               #   zero-commons lock + the R1c DataTable DECISION GATE + the baseline
│   ├─ FS12_REPORT.md               # §10 = acceptance (size-limit → 756 kB, the Prettier legacy
│   │                               #   carry-over, I1/I2 reported MISSED with two control builds)
│   ├─ FS12_REPORT_SIZE_ADDENDUM.md # the dedicated bundle analysis behind the 756 ruling (§6 = ruling)
│   ├─ STAGE_FS13_PLAN.md           # + D1–D15 contract findings (NO preferences resource, no self-service
│   │                               #   account write, no MFA/session/export call) · the same seven fixed
│   │                               #   sections · T-FS13.1 = the zero-commons lock + THREE decision gates
│   ├─ FS13_REPORT.md               # §9 = acceptance (size-limit → 777 kB; the I2 deviation on /audit and
│   │                               #   /providers accepted EXACTLY as measured, four builds + control C)
│   ├─ FS13_REPORT_SIZE_ADDENDUM.md # the dedicated bundle analysis behind the 777 ruling (§7 = ruling)
│   ├─ STAGE_FS14_PLAN.md           # + the D3 Part C journey audit (§2) · D1–D15 contract findings (no
│   │                               #   validation-result read, no post↔image link) · the same seven fixed
│   │                               #   sections · T-FS14.1 = the zero-commons lock + THREE decision gates
│   │                               #   (observability sink, global-error, font pin) + the R1i consumer trace
│   ├─ FS14_REPORT.md               # §11 = acceptance (size-limit UNCHANGED at 777 kB — no re-baseline
│   │                               #   needed; the observability client sink measured + refused, frozen
│   │                               #   server-only by owner ruling; the Prettier .size-limit.json carry-over
│   │                               #   accepted per the FS12 precedent)
│   ├─ FS14_REPORT_SIZE_ADDENDUM.md # the dedicated bundle analysis (§8 = the owner's "no ruling needed" note)
│   ├─ STAGE_FS15_PLAN.md           # the terminal stage's plan — production readiness, zero new screens,
│   │                               #   D2 Docker/Compose overlay · D3 secrets-scan scope · D4 local
│   │                               #   Lighthouse · D5 terminal-stage framing
│   ├─ FS15_REPORT.md               # §11 = acceptance (size-limit UNCHANGED, re-confirmed with zero
│   │                               #   movement; FE-RV-3/4/17 explicitly NOT closed — no Docker/CI/live
│   │                               #   backend exists here; two FS1_POSTMORTEM §7 items closed for real)
│   ├─ FS15_REPORT_SIZE_ADDENDUM.md # the dedicated bundle analysis (§5 = the owner's "no ruling needed"
│   │                               #   note, mirroring the FS14 precedent exactly)
│   ├─ PRODUCTION_READINESS_RUNBOOK.md  # NEW at FS15 — a standing PROCEDURE, not a stage narrative: ten
│   │                               #   numbered items (Docker validation, CI execution, five infra-gated
│   │                               #   FS1-postmortem-§7 items, CSP enforcement, staging Lighthouse, and
│   │                               #   the one session that closes FE-RV-7…16 together), each with its
│   │                               #   exact command sequence and single adjustment point
│   └─ README.md                    # track overview, status table, commands, guardrails — refreshed at FS15
├─ docker-compose.console.yml       # NEW at FS15 (T-FS15.2, D2 Option A) — a frontend-local Compose
│                                   #   overlay adding the `console` service on the FS1 Dockerfile; root
│                                   #   docker-compose.yml and docker/Caddyfile are NOT touched by this
│                                   #   file or by any frontend stage; the shared-Caddy route is ONE
│                                   #   manual step deferred to the Runbook, not attempted here
└─ console/                         # THE APPLICATION (Next.js)
```

## 3. `webplatform/console/` — application structure

### 3.1 Configuration files

| File | Purpose |
|---|---|
| `package.json` | scripts, exact pinned dependencies, `sideEffects: ["**/*.css"]` (FS3 — enables tree-shaking), `packageManager: pnpm@9.15.9` |
| `pnpm-lock.yaml` | the lockfile — always `--frozen-lockfile` in CI |
| `.npmrc` | `auto-install-peers=true`, `strict-peer-dependencies=false` (`resolution-mode=highest` removed in FS1 — native/JS skew hazard) |
| `.nvmrc` | `22.23.1` |
| `tsconfig.json` | strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `noImplicitOverride` + `verbatimModuleSyntax`; `@/* → ./src/*`; tests are typechecked too (the tone mechanism relies on it) |
| `eslint.config.mjs` | flat config: ts-eslint strict+stylistic, jsx-a11y, react-hooks, Next; `no-explicit-any: error`; relaxed for config/`scripts/`/test/story files (`no-console`, `no-explicit-any`, `no-empty-function` off there) |
| `.prettierrc.json` | printWidth 100, 2 spaces, single quotes, trailing commas, LF |
| `dependency-cruiser.config.cjs` | FSD boundary enforcement — no-circular, upward-import bans, no cross-feature/cross-entity |
| `postcss.config.mjs` | single `@tailwindcss/postcss` plugin (Tailwind v4, CSS-first) |
| `next.config.ts` | `output: 'standalone'`, security headers, CSP report-only, `eslint.ignoreDuringBuilds`; FS5: server-pass webpack alias `'msw/browser': false` (msw exports `node: null` — the SSR compilation of the client graph must not resolve the worker); **FS14: the enforced-CSP header authored as a constant, deliberately never sent** — a unit test asserts the response still carries the Report-Only key (closes into FE-RV-17, not this stage) |
| `vitest.config.ts` | jsdom, RTL, MSW setup, excludes `tests/e2e` |
| `playwright.config.ts` | 3 projects (desktop-dark, desktop-light, mobile), `webServer: pnpm start` |
| `.size-limit.json` | total-JS regression detector — **777 kB** (ninth measured re-baseline, FS13 acceptance after `FS13_REPORT_SIZE_ADDENDUM.md`; **UNCHANGED through FS14 and FS15**, measured 766.23 at both acceptances — no re-baseline needed at either; rule №33: never pre-raise, measure-then-propose. **Carries a Prettier CRLF carry-over from the FS13 threshold edit, owner-ruled a legacy carry-over at FS14 and reaffirmed at FS15 — the file is not to be modified on that basis, by any stage, ever again unless the owner explicitly reopens it**) |
| `scripts/check-route-budget.mjs` | FS3 gate: runs `next build`, parses Next's route table, **fails >180 kB per route**, writes `.next/route-budget.json` |
| `scripts/check-no-secrets.mjs` | **NEW at FS15** (T-FS15.4.1) — a one-off scan of `.next/standalone` + `.next/static` (excluding `node_modules` — its first run found a false positive inside Next's own vendored WASM) for credential-shaped patterns; run once and recorded, **not wired into `ci.yml`** (D3 Option A) |
| `scripts/lighthouse-local.mjs` | **NEW at FS15** (T-FS15.4.3) — a reusable local Lighthouse runner over a Playwright-launched Chromium (CDP `--port`, not a direct `chrome-launcher` spawn, which fails here with a WinSxS error); output is explicitly a **workstation measurement**, never staging/production evidence |
| `public/mockServiceWorker.js` | MSW worker file (generated `msw init`, FS5) — serves the local/ci data fixtures |
| `Dockerfile` | multi-stage, node:22-alpine, non-root, standalone, healthcheck (FE-RV-3) — wired into the deployment topology at FS15 via the sibling overlay `webplatform/docker-compose.console.yml` (§2 above), not by editing this file |
| `.env.example` | public env contract: 3 `NEXT_PUBLIC_*` values |
| `.storybook/*` | **Vite** builder (FS2), a11y + themes addons, `next/link`/`next/navigation` mocks |
| `.github/workflows/ci.yml` | ten-gate pipeline; build step = `pnpm budget` (never executed as real CI — FE-RV-4). **FS15 fixed a real gap**: the E2E step ran only `--project=desktop-dark`; it now runs all three shipped projects, matching what every stage since FS1 has certified on a workstation. Job timeout raised 30→45 min (a stated buffer, not a measured CI wall-clock) |

### 3.2 `src/` — source tree (608 files, unchanged through FS15 acceptance; 54 stories)

```
src/
├─ instrumentation.ts               # FS14: server-only Stage 2 §11 sink — process.start + onRequestError,
│                                   #   allowlisted to error NAME + digest; ships ZERO client bytes
├─ middleware.ts                    # FS4: backend-cookie PRESENCE + onyx-role hint; decideAccess unchanged
├─ app/                             # Next App Router — THIN
│  ├─ global-error.tsx              # FS14: root error boundary (Stage 2 §11); assumes NO provider (own
│  │                                #   <html>/<body>, no shared/ui import); reports NOTHING to a client
│  │                                #   sink by owner ruling — /api/telemetry has no client caller (§6)
│  ├─ layout.tsx                    # cookies → <html data-*>; REAL session via getServerSession (FS4)
│  ├─ providers.tsx                 # FixtureBoot(FS5, technical adapter) → NuqsAdapter → the frozen 7 providers
│  ├─ _auth/session.ts              # getServerSession/requireSession (server /auth/me re-check, SEC-2)
│  ├─ _stub/{PageStub,StubStates}.tsx
│  ├─ (public)/  login/page.tsx → features/auth LoginForm · register → RegisterNotice (honest)
│  ├─ (workspace)/ layout (requireSession) · @inspector · dashboard/page.tsx ← FS5 REAL RSC page
│  │              (cookies → serverApiOrNull /channels + parallel scoped fetches → DashboardView initial
│  │               with forChannelId; scenario via lazy fixtures/guard import in fixture env only)
│  │              · chat/[[...id]]/page.tsx ← FS6 REAL (RSC shell → ChatView; local-first, no server data)
│  │              · knowledge/[[...docId]]/page.tsx ← FS7 REAL (RSC channel-scoped /documents list with
│  │                forChannelId → KnowledgeView; the reader/detail is a LAZY client surface)
│  │              · memory/[[...scope]]/page.tsx ← FS8 REAL (RSC personas+actors with forChannelId →
│  │                MemoryView; `/memory/<personaId>` is the persona deep link, §3.5 URL contract)
│  │              · studio/[[...id]]/page.tsx ← FS9 REAL (RSC channel-scoped /images list with
│  │                forChannelId → StudioView; `/studio/<imageId>` is the record deep link)
│  │              · prompts/[[...path]]/page.tsx ← FS10 REAL (RSC `GET /prompts` — **NO channel scope and
│  │                no /channels fetch**: the record has no channel_id; `/prompts/<type>` and
│  │                `/prompts/<type>/versions/<n>` are the deep links)
│  │              · analytics/page.tsx ← FS11 REAL (RSC channel- AND range-scoped snapshot + /cost by day
│  │                with forChannelId **and forRange**; `?from=&to=`, `?group_by=`, `?period=` are the
│  │                contract's own parameters living in the URL)
│  │              · (account)/settings/[[...section]]/page.tsx ← FS13 REAL (RSC shell, **NO server fetch** —
│  │                the contract has no preferences resource; the section lives in the PATH)
│  │              · (account)/profile/page.tsx ← FS13 REAL (RSC shell; the Sessions honesty content is
│  │                rendered HERE on the server and passed to the client view as a SLOT)
│  ├─ (platform)/ (account)/        # layouts requireSession; /channels, /playground, /docs = honest stubs
│  │                                #   (confirmed at FS14 GO to stay stubs — D9 — 3 routes, verified
│  │                                #   directly against shared/config/routes.ts, 24 entries total)
│  └─ api/
│     ├─ auth/{login,logout,me}/route.ts   # FS4 BFF (cookie handling; RAW set-cookie appends ONLY)
│     ├─ ai/stream/route.ts         # FS6 AI SSE relay (SEC-2 guard; VERBATIM; replaced the FS1 demo)
│     ├─ telemetry/route.ts         # FS14: first-party sink, NOT an /api/v1 endpoint; Zod `.strict()`
│     │                             #   allowlist, always 204; NO client caller today (owner ruling, §6)
│     └─ config/route.ts
├─ widgets/
│  ├─ app-shell/ sidebar/ topbar/{Topbar,ChannelSwitcher(REAL, FS5),AvatarMenu(real logout)}
│  ├─ command-palette/ shortcut-cheatsheet/ mobile-nav/
│  ├─ inspector/                    # Inspector + view registry: PostInspector, JobInspector (FS5),
│  │                                #   ConversationInspector (FS6), DocumentInspector (FS7 — LAZY row:
│  │                                #   overview/versions/re-ingest/delete/assign, edit-gated),
│  │                                #   DatapointInspector (FS11 — LAZY row; a PURE projection of the Query
│  │                                #   cache that performs ZERO fetches), TaskInspector + AuditInspector
│  │                                #   (FS14: progressive disclosure — Advanced/Power reveal the raw
│  │                                #   record/jsonb the screen already holds via useAccountPreferences,
│  │                                #   zero extra requests, zero First Load cost — already-lazy row)
│  ├─ knowledge/                    # FS7: KnowledgeView (shell+list eager; Reader/AddSource/Ask LAZY),
│  │                                #   DocumentList (j/k/↵), KnowledgeEmpty (D2 §15), RetrievalHonesty
│  │                                #   (the honest "no simulated retrieval" surface), markdown-embed
│  ├─ memory/                       # FS8: MemoryView (shell+kind-grouped list eager; PersonaDetail/
│  │                                #   ActorDetail/PublishedMemoryList/Edit/Explain LAZY), MemoryGroupList,
│  │                                #   MemoryEmpty (D3 §8 copy), MemoryHonesty (trace/global/pin seams)
│  ├─ prompts/                      # FS10: PromptLibraryView (shell+type list eager; PromptDetail/
│  │                                #   PromptDiff LAZY), PromptTypeList (PromptCard rows, j/k/↵),
│  │                                #   PromptsEmpty (D2 §15), PromptsHonesty (activation/variables/
│  │                                #   platform-wide/author/lifecycle seams). The diff renders its own
│  │                                #   +/- lines — NO CodeBlock/Shiki (PART2 §2.9 first-consumer rule)
│  ├─ studio/                       # FS9: StudioView (shell+grid eager; ImageDetail/SimilarityReport/
│  │                                #   GenerationHistory/ReferencesPanel LAZY), ImageGrid (ONYX
│  │                                #   ImageResult cards, non-interactive by a11y contract), StudioEmpty,
│  │                                #   StudioHonesty (generation/preview/attach/safety seams — the
│  │                                #   `attach` variant existed since FS9 but rendered NOWHERE until FS14
│  │                                #   mounted it in ImageDetail, where the missing affordance would be)
│  ├─ analytics/                    # FS11: AnalyticsView (shell + filters + KPI row eager; CostPanel/
│  │                                #   QualityPanel/TrendsPanel/ReportPanel LAZY), PanelFrame (owns the
│  │                                #   §R11.9 provenance whisper + per-panel states), MetricRow, MetricList,
│  │                                #   GatedPanel (the §R10.3 headline), AnalyticsEmpty, AnalyticsHonesty
│  │                                #   (anomaly/forecast/recommendation/system/liveness seams)
│  ├─ dashboard/                    # FS5: DashboardView/Empty, MetricTiles, ScheduleTimeline,
│  │                                #      NeedsReviewQueue, DashboardActivity (lazy), index
│  │                                # FS6: DashboardSummary (lazy, user-invoked) + summary-prompt.ts (pure)
│  │                                # FS14: DashboardView gained one route-local hop to /jobs, reusing the
│  │                                #      router the view already held (router.push — measured cheaper
│  │                                #      than a fresh `next/link` import by 4 kB, FS14_REPORT §4.4)
│  ├─ settings/                     # FS13: SettingsView (nav + Appearance eager; the OTHER FIVE panels in
│  │                                 #   ONE lazy module — SecondaryPanels), Panel/PanelRow/LocalNote/
│  │                                 #   AbsenceRow, SettingsHonesty (SERVER — rendered by the RSC page),
│  │                                 #   sections.ts (registry; unknown segment → Appearance)
│  ├─ profile/                      # FS13: ProfileView (header + 3 URL tabs; ActivityPanel + the AI panel
│  │                                 #   in ONE lazy module), ★identity.ts (WIDGET-level projection — do NOT
│  │                                 #   extend entities/session, it is in every route's First Load),
│  │                                 #   ★useMyActivity.ts (non-nullable actor = the privacy lock),
│  │                                 #   ProfileHonesty (SERVER — the sessions absence)
│  ├─ jobs/ health/ audit/ providers/ billing/ admin/ platform-seams/   # FS12: the nine (platform) routes
│  │                                 #   (full detail: FS12_REPORT.md — not re-diagrammed here since FS13)
│  │                                 #   JobsHonesty + HealthHonesty (FS14: each gained a SERVER-rendered
│  │                                 #   cross-link strip — Jobs↔Dashboard/Chat/Audit, Health↔Jobs/Audit —
│  │                                 #   kept as plain `<a>` with a per-line ESLint suppression after
│  │                                 #   `next/link` measured +4 kB on BOTH routes, FS14_REPORT §4.4)
│  └─ chat/                         # FS6: ChatView (shell+composer instant; Thread/HistoryRail/InsertDialog
│                                   #      LAZY), Thread (virtualized), HistoryRail, ChatEmpty, MessageItem
├─ features/
│  ├─ auth/                         # FS4: LoginForm, RegisterNotice, useLogin/useLogout, schema+safeNextPath
│  ├─ review-post/                  # FS5: useReview (202 intents), ReviewActions
│  ├─ send-message/                 # FS6: useSendMessage (persist→stream→reconcile; wire-only cost), Composer
│  ├─ insert-to-channel/            # FS6: useInsertToChannel (201+optional 202), InsertDialog
│  ├─ add-source/                   # FS7: useAddSource (multipart→assign; honest phases, no invented %),
│  │                                #   useDocumentIntents (202 reindex/soft delete/assign), AddSourceDialog
│  ├─ ask-document/                 # FS7: ★buildDocumentPrompt (pure, unit-proven single-document scope) +
│  │                                #   AskDocumentPanel (Trust/Citation→real source/KnowledgeCard/cost)
│  ├─ edit-persona/                 # FS8: guarded PATCH of voice fields + archive; §R4.2 optimistic lock →
│  │                                #   honest 409 conflict; audited-server-side copy; style_features RO
│  ├─ explain-style/                # FS8: ★buildPersonaPrompt (pure, unit-proven single-persona scope) +
│  │                                #   ExplainStylePanel (Trust/MemoryCard→real persona record/cost)
│  ├─ regenerate-image/             # FS9: useImageIntents (202 regenerate + guarded soft delete),
│  │                                #   RegenerateAction (no accept/attach — no contract call exists)
│  ├─ upload-references/            # FS9: useUploadReferences (§R6.1 multipart over the FS7 seam; honest
│  │                                #   phases, no invented %), UploadReferencesDialog (§R6.2 copy)
│  ├─ explain-verification/         # FS9: ★buildImagePrompt (pure, unit-proven single-image scope; forbids
│  │                                #   safety/identity/uniqueness claims) + ExplainVerificationPanel
│  ├─ manage-prompt/                # FS10: the contract's ONLY prompt write — POST /prompts = a NEW
│  │                                #   VERSION (confirmed, 201 truth) + ★promptDraft.ts (the ONLY storage
│  │                                #   toucher on this surface) + Zod schema + VersionComposer (lazy)
│  ├─ test-prompt/                  # FS10: ★buildPromptRun (pure, unit-proven: ONLY that version's text
│  │                                #   + the user's sample) + TestPromptPanel (isolated dry-run §R10.9;
│  │                                #   NO authoring, NO auto-save, NO refine, NO compare)
│  ├─ filter-analytics/             # FS11: useAnalyticsRange (URL owns range/facet/period; data-changing
│  │                                #   keys PUSH, view affordances REPLACE) + ★range.ts (PURE — "today" is
│  │                                #   an argument, never a clock read) + RangeControls
│  ├─ export-analytics/             # FS11: ★toCsv (pure; gated series EXCLUDED and named; computes nothing)
│  │                                #   + ExportMenu (lazy) — Copy link + client-side CSV, NO endpoint
│  ├─ change-settings/              # FS13: ★model/preferences.ts — THE single storage toucher (versioned
│  │                                 #   payload, sanitize() degrades any untrusted record, `danger` stripped
│  │                                 #   on read AND write, cookie mirror for the emitter) + useAccountPreferences
│  │                                 #   (useSyncExternalStore; server snapshot = DEFAULTS). NO query, NO
│  │                                 #   mutation, NO server state — the contract has none.
│  ├─ explain-activity/             # FS13: ★buildActivityPrompt (pure, unit-proven: only the loaded records,
│  │                                 #   field NAMES not values, no user identity; forbids security advice,
│  │                                 #   completeness, intent, risk, anomaly) + ExplainActivityPanel
│  └─ explain-metrics/              # FS11: ★buildMetricsPrompt (pure, unit-proven: only the loaded
│                                   #   NON-GATED values + the filters; forbids causes/anomalies/forecasts/
│                                   #   engagement) + ExplainMetricsPanel (lazy)
├─ entities/
│  ├─ session/                      # FS4: useSessionQuery
│  ├─ channel/ analytics/ job/ post/  # FS5: model(VM+mapper)+hooks+index each
│  ├─ conversation/                 # FS6 LOCAL-FIRST: model + ★ConversationRepository (THE single storage
│  │                                #   toucher & future-API swap point) + Zustand mirror + hooks; caps 50/200
│  ├─ document/                     # FS7: model(VM+mappers, ingest flags, list filtering) + hooks (polling
│  │                                #   while ingesting) + ★paths.ts (entity-local §R9.3 calls) + ui/VersionsTimeline
│  ├─ persona/                      # FS8: model(VM + ★mapStyleFeatures §R9.12 — unknown keys stay honest) +
│  │                                #   hooks + ★paths.ts (§Personas calls) + ui/StyleFeatureList (stateless)
│  ├─ actor/                        # FS8: model(visual identity ONLY — Persona ≠ Actor; generation
│  │                                #   internals never mapped) + hooks (read-only) + ★paths.ts
│  │                                #   (FS9 added ONE line: the §R6.1 references path)
│  ├─ image/                        # FS9: model(VM + ★mapSimilarityReport §R6.4 — unknown keys stay honest;
│  │                                #   previewUrl always null: storage_path is a KEY, not a URL) + hooks
│  │                                #   (honest polling; unknown status ⇒ no poll) + ★paths.ts + ★keys.ts
│  │                                #   (entity-local — commons gained ZERO rows) + ui/ImageMetaList
│  ├─ location/                     # FS9: read-only scene inputs (§R6.3) — model/hooks/paths/keys; used
│  │                                #   only to resolve an image's location_id at the WIDGET level
│  ├─ analytics-report/             # FS11: a SEPARATE slice from `analytics` (FS5) — a `'use client'` module
│  │                                #   re-exported from that barrel entered /dashboard's First Load. Owns
│  │                                #   ★keys.ts (range-scoped; positionally unmatchable by the FS5
│  │                                #   invalidation) + ★paths.ts (the five READ calls) + report-model
│  │                                #   (★mapMetricEntry — GATED wins over any value; unknown keys by RAW
│  │                                #   name; algorithm version only when the wire carries one) +
│  │                                #   report-hooks (NO mutation exists — the group is read-only)
│  └─ prompt/                       # FS10: model(VM + grouping by TYPE — the contract's identity; unknown
│                                   #   types by raw value; NO active/variables field ever produced; author
│                                   #   stays a raw id + ★diffVersions, a pure line diff) + hooks (no
│                                   #   polling: POST answers 201, not 202) + ★paths.ts + ★keys.ts —
│                                   #   entity-local AND **channel-free by construction** (requirement A)
├─ shared/
│  ├─ config/  routes.ts(★registry; FS9 PATCHed /studio → content.view) rbac.ts route-access.ts shell.ts theme.ts
│  │           shortcuts.ts(★handler side: chords/types/guard — COMMONS, kept tiny)
│  │           shortcuts-catalog.ts(★display side: SHORTCUTS+labels — LAZY cheat-sheet only, FS8 T-FS8.1)
│  │           auth.ts(FS4: cookie names, role-hint serializers) env.ts server-env.ts(FS4)
│  │           fonts.ts(★FS14: `next/font/local` over TWO committed `.woff2` binaries — closes FE-RV-5;
│  │           was `next/font/google`; the CSS variable NAMES are unchanged, so tokens.css/layout.tsx are
│  │           byte-identical; LATIN-ONLY subsets — other scripts fall back to the system stack)
│  │           query-keys.ts(FS5+FS7+FS8 keys; FS9/FS10/FS11/FS14 added ZERO rows — image/location,
│  │           prompt, analytics-report keys are all entity-local; FS14 declared no key at all, like FS13)
│  │           models.ts(FS6: static AI-model registry, *(assumed)*)
│  ├─ lib/
│  │  ├─ api/{apiFetch(+formData FS7,+gate),endpoints,boot-gate★(FS7),correlation-id,
│  │  │       server-fetch(FS5 RSC access + fixture branch)}
│  │  ├─ auth-gateway/{types,map,real,fixture,select,index}   # FS4 seam (kill-switched fixture)
│  │  ├─ ai-gateway/{types,sse,real,fixture,select,index}     # FS6 seam: VERBATIM relay + kill-switched
│  │  │                                                       #   deterministic AI fixture (local/ci only)
│  │  ├─ fixtures/{guard,dataset,browser,meta(FS7),FixtureBoot}  # FS5 data seam (kill-switched); FS7 adds
│  │  │                                                       #   the /documents group (stateful, poll-based
│  │  │                                                       #   ingest — no clocks) + PUT/DELETE + body meta;
│  │  │                                                       #   FS9 adds IMAGES/HISTORY/SIMILARITY/LOCATIONS,
│  │  │                                                       #   the 202 regen countdown, soft delete and the
│  │  │                                                       #   multipart reference upload (NO image URLs)
│  │  ├─ notifications/                                       # FS13: ★muted-toasts.ts — the D5-B READ side.
│  │  │                                                       #   Lives in COMMONS because FSD forbids
│  │  │                                                       #   NotificationProvider importing a feature;
│  │  │                                                       #   a cookie read, no storage primitive, no
│  │  │                                                       #   imports. `danger` refused before reading.
│  │  │                                                       #   THE measured cause of the FS13 I2 deviation.
│  │  │  (★NO `shared/lib/observability/` exists — FS14 built it, measured it in two placements, and
│  │  │   removed it when the pre-declared fallback fired; a unit test asserts the import throws. The
│  │  │   server half lives OUTSIDE `shared/`, at `src/instrumentation.ts` + `app/api/telemetry/route.ts`.)
│  │  ├─ persist/                                             # FS6: versioned localStorage primitive
│  │  ├─ errors/ query/ stream/(openStream,reconcile,assistant★ FS6 transient streaming store+hooks)
│  │  ├─ rbac/ format/ store/
│  ├─ providers/                    # the frozen 7 (Notification renders shared/ui ToastCard since FS3)
│  ├─ hooks/{useMediaQuery,useDisclosure,useInspector,useBreadcrumbs}
│  ├─ types/{status.ts(12+parseStatus), dto.ts(wire mirrors: auth FS4; channels/posts/tasks/analytics/cost
│  │          FS5; dry-run/post-create FS6; documents/versions/assign FS7 — all *(assumed)* casing)}
│  └─ ui/                           # FS3: the COMPLETE ONYX library — NO root barrel; import
│     │                             #   @/shared/ui/<component> (AI set: @/shared/ui/ai); README.md = convention
│     ├─ tone.ts(★ typed text-tone) button/ empty-state/ skeleton/ kbd/ spinner/ theme-toggle/ icon/
│     ├─ tooltip/ sheet/ breadcrumbs/ scroll-area/ nav-link/ field/ input/ textarea/ search-input/
│     ├─ select/ combobox/ checkbox/ switch/ radio/ segmented-control/ filter-bar/ card/ metric-card/
│     ├─ tabs/ dialog/ menu/ context-menu/ popover/ divider/ progress-bar/ avatar/ badge/(+StatusBadge)
│     ├─ error-state/ timeline/ activity-feed/ toast/ file-upload/
│     ├─ data-table/ markdown/ code-block/(+onyx-shiki-theme) chart/    # HEAVY — each has lazy.tsx
│     └─ ai/ streaming-message/ thinking-state/ tool-call/ citation/ memory-card/ knowledge-card/
│           image-result/ prompt-card/ verification-badge/ trust-label/ explainability-panel/ ai-composer/
└─ styles/ tokens.css(★frozen values) themes.css(+onyx-shiki flip) base.css
```

### 3.3 `tests/` (103 Vitest-counted files at FS15 acceptance — the terminal count; 102 at FS14; 99 at FS11 —
the historical additions below stop at FS11 and were not re-logged stage by stage at FS12/FS13; the FS14 and
FS15 additions are each logged in full below)

`setup/{vitest.setup.ts(+jsdom stubs: ResizeObserver, scrollIntoView, pointer-capture, **matchMedia** FS5,
**Blob.stream/arrayBuffer/text** FS7 — without them undici stalls serializing multipart uploads),
axe.ts(per-component harness; jsdom `color-contrast` off — rendered contrast is the Playwright gate)}` ·
`msw/{handlers(BFF path-only matchers + **path-only `/api/v1/*` wildcard handlers backed by
`resolveFixture`** — FS5),server}` · `unit/` (api/errors/format/rbac/route-access/shell/palette/stream/
store/tone(★type-proof)/auth-{gateway,schema,integrity(★grep lock)}/middleware-auth + FS5:
**fixtures**(resolveFixture contract semantics) · **fixture-integrity**(★kill-switch throw + static-import
grep lock) · **entity-mappers**(gated⇒null+flag · secret-drop proof · parseStatus unknowns) + FS6:
**persist** · **conversation-repository**(CRUD/eviction/caps) · **ai-gateway**(★verbatim-relay trio +
kill-switch + grep lock) · **summary-prompt**(gated exclusion incl. smuggled wire numbers) ·
**assistant-stream**(done/error over MSW SSE) + FS7: **document-mappers**(ingest flags · unknown statuses ·
list filtering · knowledge shortcut rows) · **document-fixtures**(the whole /documents group incl.
poll-based ingest completion) · **document-prompt**(★the byte-exact single-document proof) ·
**markdown-embed**(heading demotion, fences preserved)) · `component/`
(Button/EmptyState/Breadcrumbs/Sheet/StatusBadge/FormControls/Overlays/Feedback/DataTable/
MarkdownCodeBlock(shiki mocked)/Chart(RO+rect stubs)/FileUpload/AiComponents/LoginForm + FS5:
**MetricTiles**(per state + the per-card isolation proof) · **NeedsReviewQueue**(j/k/↵, RBAC per role,
queued toast) · **DashboardView**(composition per role, gated tile, empty hero) + FS6:
**Composer**(keyboard contract) · **DashboardSummary**(no-auto-run/Trust/Explainability/RBAC) ·
**ChatView**(create-and-navigate · stream-and-reconcile with wire cost · rect stubs for the virtualizer) +
FS7: **KnowledgeView**(per role/state · j/k/↵ · reader · empty) · **AddSourceDialog**(accepted/rejected,
no % anywhere) · **AskDocumentPanel**(no-auto-run · Trust · real-source Citation · scoreless card) ·
**DocumentInspector**(RBAC · 202 wording · guarded delete)) ·
`msw/` also carries the FS6 path-only `/api/ai/stream` SSE handler and (FS7) PUT/DELETE + body-meta
extraction for the `/documents` group · `e2e/`
(shell.spec + navigation.spec + **dashboard.spec** (FS5: 7 journeys — deterministic metrics, gated tile,
j/k/↵→Inspector, 202 toast, channel-switch re-scope, roles read-only, empty scenario, axe) +
**chat.spec** (FS6: 9 journeys — streamed turn with wire cost/model · Stop-preserves-partial · reload
persistence + `[`/`]` · insert 201+202 · palette `/` hand-off · user-invoked summary · analyst/viewer
honesty · axe) + **knowledge.spec** (FS7: 10 journeys — list with ingest badges · j/k/↵→Inspector · reader
deep-link + versions · upload→ingesting→ready (poll-based) · 202 re-ingest · palette `#` deep-link ·
ask-document with the provenance citation · analyst read-only · empty state · axe on list AND reader) —
every journey signs in through the REAL form; fixture accounts. Sharp E2E edges (FS6): `getByLabel`
matches by substring — use `{ exact: true }` near the chat's "Conversation…" labels; anchor post-stream
assertions on the wire-cost done marker (the transient streaming node is replaced on done). **(FS7):**
heading selectors near embedded markdown need **role + level** (content headings share the chrome's
accessible name); on mobile single-pane screens `.first()` can hit a `display:none` pane — scope to the
visible region (e.g. the reader `article`); kill port 3000 before any build/E2E.

**FS11 test additions (99 files total):** unit — `analytics-commons`(★the zero-commons lock **and** the
FS5-coexistence lock: the FS5 keys are byte-identical and the new range keys are proved **positionally
unmatchable** by `review-post`'s `['analytics', channelId]` invalidation, in both directions) ·
`analytics-mappers`(★a GATED field with a number on the wire still maps to null · unknown keys by RAW name ·
an algorithm version only when the wire carries one · a gated series plots nothing · null points are dropped,
never zeroed) · `analytics-range`(pure preset/shift/parse maths against a fixed "today") ·
`analytics-fixtures`(the whole group: the real `?from=&to=` filter, all four `group_by` facets, the three
report periods, an honest empty range, and the proof that **no write, forecast, anomaly, recommendation,
experiment, export, system or diversity endpoint exists**) · `metrics-prompt`(★the byte-exact proof: only the
loaded non-gated values + filters, gated metrics excluded **even when they carry a number**, and the
forbidden-claims instruction) · `analytics-ownership`(the §3.4 locks + **FS11 contains no `useMutation`, no
`invalidateQueries` and no `setQueryData` at all** + the CSV computes nothing); component —
`AnalyticsView`(per role/state · the gated card with **no number** · **per-panel error isolation** — failing
ONLY quality leaves cost and trends alive · provenance incl. the absent-algorithm-version path · the honest
absences · the empty state) · `DatapointInspector`(resolves from the cache, **fetch spy never called**, raw
keys marked, and the honest cold-cache state); e2e — `analytics.spec.ts` (15 journeys ×3 viewports incl. axe
on the panel grid and on a datapoint Inspector).

**FS10 test additions (90 files at that acceptance):** unit — `prompts-commons`(★the zero-commons lock **and** the
CHANNEL-FREE lock: no prompt builder may accept a `channelId` — asserted by function ARITY, not just by call;
no channel vocabulary anywhere in the slice) · `prompt-mappers`(unknown type by raw value · author stays an
id · **no `active`/`variables` key is ever produced**) · `prompt-diff`(a table of text pairs; identical /
added / removed / changed / empty / the coarse cap) · `prompt-fixtures`(the whole §Prompts group: `?type=`
filtering, the version chain, POST → 201 with a server-assigned version, 400 on empty, and proof that no
update/delete/promote route and no channel path exists) · `prompt-run`(★the byte-exact single-version proof:
only that version's text + the user's sample, no metadata leakage) · `prompts-ownership`(the six §3.4 locks +
**the owner's requirement B in both directions**: no FS10 module imports any Dashboard/Chat/Knowledge/Memory/
Studio slice and none of them imports the prompt surface); component — `PromptLibraryView`(per role/state ·
**no Active/Draft badge, no variables count, no delete/rename** · `j/k` · raw unknown type · the `?type=`
facet · empty state · a failed fetch never reads as empty) · `VersionComposer`(201 truth, never "queued" ·
draft persistence and clearing · no promote/delete/variable helper) · `PromptInspector`(chain resolution ·
raw author id · no badges) · `PromptDiff`(+/- lines · screen-reader labels · **no highlighter**) ·
`TestPromptPanel`(no auto-run · Trust · provenance · wire cost · **no confidence** · no save/refine/compare);
e2e — `prompts.spec.ts` (14 journeys ×3 viewports incl. **a channel switch changing nothing**, diff
Back-reversibility, draft-survives-reload, and axe on the library and a version detail).

**FS9 test additions:** unit — `studio-commons`(★the zero-commons lock: no image/location
builder in `shared/config/query-keys.ts`, namespaces cannot collide) · `image-mappers`(no preview from a
storage key · no safety field · unknown status ⇒ no polling · unknown similarity keys by raw name) ·
`image-fixtures`(the whole §Images group incl. the 202 regen countdown, soft delete, references upload, and
the proof that NO fixture carries an image URL) · `image-prompt`(★the byte-exact single-image proof + the
forbidden-claims instruction) · `studio-ownership`(the §3.4 locks + the I3–I6 regression locks); component —
`StudioView`(per role/state · wire-derived chips only · no `<img>` · no generation/attach affordance ·
`j/k` · references panel) · `ImageInspector`(RBAC · 202 wording · guarded delete) ·
`UploadReferencesDialog`(**no percentage anywhere**) · `ExplainVerificationPanel`(no-auto-run · Trust ·
image provenance · no confidence); e2e — `studio.spec.ts` (12 journeys ×3 viewports incl. axe on the grid
and the record detail).

**FS14 test additions (102 Vitest-counted files total):** unit — `csp-and-telemetry`(★source-level, comment-
stripped locks: the CSP header stays Report-Only in code · the telemetry route accepts an ALLOWLIST via
`.strict()` and answers only `204` · `instrumentation.ts` reports server errors by NAME and digest only,
never `message`/`.stack` · **the client sink module does not exist** — asserted by an import that must throw
— · both Inspector rows reading `useAccountPreferences` do so through the ONE preferences module with no
direct `localStorage` access and no extra `apiFetch` per disclosure tier); e2e —
`tests/e2e/journeys.spec.ts` (11 tests ×3 viewports: the five D3 Part C journeys, each hop asserting a wire
fact — a 202's queued wording, a returned task id, a served number — never a URL change alone; every step
the contract cannot back asserted as a named seam) · `tests/e2e/polish.spec.ts` (12 tests ×3 viewports: the
three D4 §3 checks never previously executed — 320px reflow across 15 screens, 200% zoom,
`prefers-reduced-motion` — plus the axe scan that finally opens the avatar menu and command palette overlays
and caught the sixth `text.tertiary` contrast defect).

**FS15 test addition (103 Vitest-counted files total — the terminal count of the implementation track):**
unit — `gated-fields-audit`(★one cross-cutting test proving §R10.3's three-part rule — no view value, no
AI-prompt leak, no export leak — across every gated-capable surface this project has ever shipped, by
importing and exercising the REAL production functions of each surface rather than re-implementing their
logic: `entities/analytics.mapMetric`, `entities/analytics-report.{mapMetricEntry,mapSeries}`,
`widgets/dashboard.buildSummaryPrompt`, `features/explain-metrics.buildMetricsPrompt`,
`features/export-analytics.toCsv`; a closing assertion records the audited-surface count so a future
gated-capable addition is a deliberate extension of this file, not a silent gap). **No e2e file was added at
FS15** — the CI-matrix fix (§3.1) exercises the same 13 shipped spec files more completely, it does not add
a fourteenth.

## 4. Implemented components *(request item 4)*

- **FS3 — the complete ONYX library:** all 24 D2 §13 components + the §14 AI set (13), 54 story files.
  Conventions in `src/shared/ui/README.md`; the typed tone rule in `tone.ts`; heavy components strictly via
  `lazy.tsx`/`dynamic()`.
- **FS4 — real auth:** BFF `login/logout/me`, AuthGateway (real proxy verbatim-forwarding Set-Cookie ·
  fixture for local/ci under a triple unit-tested kill-switch), server session re-check in protected
  layouts, `features/auth`, `entities/session`, middleware presence+hint semantics. Mock seam DELETED
  (grep-tested).
- **FS5 — the Dashboard, delivered & accepted:** the RSC initial-data page + data-fixture seam
  (dataset/guard/browser worker/FixtureBoot, `server-fetch`), entities `channel/analytics/job/post`,
  feature `review-post` (202 queue intents), REAL ChannelSwitcher, dashboard widgets
  (View/Empty/Tiles/Timeline/Queue/Activity — per-card isolation, honest gated tile),
  Inspector post/job views. Details/defects/decisions: `FS5_REPORT.md`.
- **FS6 — AI Chat, delivered & accepted:** the AiGateway seam + VERBATIM BFF SSE relay
  (`app/api/ai/stream`), `useAssistantStream` (transient streaming owner, Stop cancels upstream, partial
  preserved), local-first `entities/conversation` behind THE ConversationRepository, features
  `send-message` + `insert-to-channel` (201/202 bridge), the chat screen (lazy heavy leaves), Inspector
  `conversation` view, palette `/` Ask AI real, DashboardSummary (user-invoked, gated-excluded prompt).
  Details/defects/decisions: `FS6_REPORT.md` + `FS6_REPORT_SIZE_ADDENDUM.md`.
- **FS7 — Knowledge, delivered & accepted:** `entities/document` (+ entity-local `paths.ts`), the RSC
  knowledge page + `widgets/knowledge` (eager shell/list; LAZY reader/add-source/ask), features
  `add-source` (honest upload machine + 202 re-ingest/delete/assign) and `ask-document` (provenance-fed
  Citation/KnowledgeCard — their FIRST real data), the LAZY Inspector `document` row, palette `#` real for
  knowledge + topbar search entry, the retrieval-honesty surface, the `/knowledge` `content.view` PATCH,
  and the transport boot-gate. Details/defects/decisions: `FS7_REPORT.md` + `FS7_REPORT_SIZE_ADDENDUM.md`.
- **FS8 — Memory, delivered & accepted:** the **commons offload** (keyboard registry split by concern —
  the stage's first action, lock-tested), `entities/persona` (+ `mapStyleFeatures` and the stateless
  `StyleFeatureList`) and `entities/actor` (+ entity-local `paths.ts` each), `usePublishedPosts` added to
  the FS5 post entity, the RSC memory page + `widgets/memory` (eager shell/kind-grouped list; LAZY detail
  panes), features `edit-persona` (guarded PATCH + archive, §R4.2 conflict) and `explain-style`
  (provenance-fed **MemoryCard** — its FIRST real data), LAZY Inspector `persona`/`actor` rows, the palette
  `#` Memory group kept separate from Knowledge, the honest-absence surfaces (trace/Global/pin/exclude) and
  the `/memory` `content.view` PATCH. Details/defects/decisions: `FS8_REPORT.md` +
  `FS8_REPORT_SIZE_ADDENDUM.md`.
- **FS9 — Image Studio, delivered & accepted:** `entities/image` (+ `mapSimilarityReport`, the stateless
  `ImageMetaList`, entity-local `paths.ts` AND `keys.ts`) and `entities/location` (read-only scene inputs),
  the RSC studio page + `widgets/studio` (eager shell/grid; LAZY detail, similarity report, attempt history,
  references panel), features `regenerate-image` (202 intent + guarded soft delete), `upload-references`
  (**the entry duty** — §R6.1 multipart over the FS7 seam, no invented progress) and `explain-verification`
  (provenance-fed AI over ONE image record; prompt forbids safety/identity/uniqueness claims), the LAZY
  Inspector `image` row, the palette `#` Images group kept separate from Knowledge and Memory, the
  honest-absence surfaces (generation · the binary itself · accept/attach · safety) and the `/studio`
  `content.view` PATCH. Details/defects/decisions: `FS9_REPORT.md` + `FS9_REPORT_SIZE_ADDENDUM.md`.
- **FS10 — Prompt Library, delivered & accepted:** `entities/prompt` (+ the pure `diffVersions`, entity-local
  `paths.ts`/`keys.ts` that are **channel-free by construction**), the RSC prompts page (**no channel scope,
  no `/channels` fetch**) + `widgets/prompts` (eager shell/type list; LAZY detail and diff), features
  `manage-prompt` (the contract's ONE write — a new version, 201 truth, plus the draft module that is the
  only storage toucher) and `test-prompt` (the owner-approved isolated dry-run of ONE version — no
  authoring, no auto-save, no refine, no compare), the LAZY Inspector `prompt` row, the palette `#` Prompts
  group kept separate from Knowledge, Memory and Images, the honest-absence surfaces
  (activation · variables · deletion · per-channel scoping · author identity · model comparison), the
  `/prompts` `content.view` PATCH, and the **owner-approved PromptCard MINOR extension**.
  Details/defects/decisions: `FS10_REPORT.md` + `FS10_REPORT_SIZE_ADDENDUM.md`.
- **FS11 — Analytics, delivered & accepted:** `entities/analytics-report` (a separate slice — the FS5
  `entities/analytics` is byte-untouched — owning the five READ paths, the range-scoped keys, the honest
  mappers and the read-only hooks), the RSC analytics page (channel- **and** range-scoped seeds) +
  `widgets/analytics` (eager shell/filters/KPI row/gated card/honesty seams; LAZY cost, quality, trends and
  report panels, every chart through the frozen `chart/lazy` entrypoint), features `filter-analytics` (the
  URL owns range/facet/period), `export-analytics` (Copy link + a client-side CSV that excludes and names
  gated series — no endpoint exists) and `explain-metrics` (user-invoked AI over the loaded non-gated values;
  the prompt forbids causes, anomalies, forecasts and engagement claims), the LAZY Inspector `datapoint` row
  (a pure cache projection that fetches nothing), analytics shortcuts in the lazy catalogue, and the
  honest-absence surfaces (anomaly · forecast · recommendations/experiments · system health · live counters).
  **No RBAC PATCH was needed** — all five roles already hold `analytics.view`.
  Details/defects/decisions: `FS11_REPORT.md` + `FS11_REPORT_SIZE_ADDENDUM.md`.
- **FS13 — Settings / Profile, delivered & accepted:** `widgets/settings` (nav + Appearance eager; the five
  other panels in ONE lazy module; `SettingsHonesty` rendered by the RSC page) and `widgets/profile`
  (header + three URL tabs; the activity list and the AI panel in ONE lazy module; the WIDGET-level
  `identity.ts` projection and the non-nullable-actor `useMyActivity` privacy lock), features
  `change-settings` (THE single storage toucher; no query, no mutation, no server state) and
  `explain-activity` (the stage's one AI surface), the `⌘,` shortcut, and the two Radix primitives the R1c
  check admitted on measurement (`shared/ui/{switch,avatar}`). **No entity slice was created and no query
  key, endpoint path or fetcher was declared** — identity is FS4's session, activity is FS12's audit slice.
  Details/defects/decisions: `FS13_REPORT.md` + `FS13_REPORT_SIZE_ADDENDUM.md`.
- **FS14 — Integration & Polish, delivered & accepted:** no new screen — instead, **five D3 Part C journeys**
  proved end to end (`tests/e2e/journeys.spec.ts`) across the fifteen real screens, plus three route-local
  cross-links (Dashboard→Jobs, Health→Jobs/Audit, Jobs→Dashboard/Chat/Audit), the **server-only**
  observability seam (`src/instrumentation.ts` + `app/api/telemetry/route.ts`; a client sink was built,
  measured twice and refused — the fallback ships), `app/global-error.tsx` (Stage 2 §11's root boundary),
  the font pin (`shared/config/fonts.ts` → `next/font/local`, closing FE-RV-5), the CSP promotion package
  (`next.config.ts`, authored not enabled), progressive disclosure on two Inspector rows (`TaskInspector`,
  `AuditInspector`), and the three D4 §3 checks this project had never run
  (`tests/e2e/polish.spec.ts`). **No entity slice, no new query key, no new endpoint path** — the second
  stage in a row after FS13. Details/defects/decisions: `FS14_REPORT.md` + `FS14_REPORT_SIZE_ADDENDUM.md`.
- **FS15 — Production Readiness, delivered & accepted — THE TERMINAL STAGE:** no new screen, **no `src/`
  production module of any kind** — the third stage in a row (after FS13, FS14) with no new entity slice,
  query key or endpoint path, taken to its widest possible scope. Delivered instead:
  `webplatform/docker-compose.console.yml` (a frontend-local Docker Compose overlay, root infrastructure
  untouched), a real CI E2E-matrix fix (`console/.github/workflows/ci.yml`, previously one of three
  Playwright projects, now all three), `scripts/check-no-secrets.mjs` (a one-off secrets-in-bundle scan),
  `tests/unit/gated-fields-audit.test.ts` (one cross-cutting §R10.3 proof across every gated surface),
  `scripts/lighthouse-local.mjs` (a workstation-only Lighthouse runner, never cited as staging/production
  evidence) and `PRODUCTION_READINESS_RUNBOOK.md` (the standing procedure for FE-RV-3/4/6/7…17, none of
  which was closed at this stage — this environment has no Docker, no CI runner and no live backend, verified
  directly). Details/defects/decisions: `FS15_REPORT.md` + `FS15_REPORT_SIZE_ADDENDUM.md`.
- Screens beyond Dashboard/Chat/Knowledge/Memory/Image Studio/Prompt Library/Analytics/the nine platform
  routes/Settings/Profile: honest stubs (D2 §15 EmptyState per route) — **3 route-registry entries remain**
  (`/channels`, `/playground`, `/docs`; verified directly against `shared/config/routes.ts` at the FS14 sync,
  reconfirmed unchanged at FS15 — see PART1 §2.2 for the reconciliation with the historically-quoted "7",
  which counted D3's 25-screen sitemap rather than the 24-entry route registry). **Building any of these
  three is a new stage with its own GO; the roadmap names none, and FS15 was the last stage on it.**

## 5. Technologies and exact versions *(request item 8)*

### 5.1 Backend (installed, Python 3.14.6) — unchanged since Stage 20

`fastapi 0.139.2 · uvicorn 0.51.0 · pydantic 2.13.4 · pydantic-settings 2.14.2 · pyyaml 6.0.3 · sqlalchemy
2.0.51 · alembic 1.18.5 · asyncpg 0.31.0 · pgvector 0.5.0 · greenlet 3.5.3 · redis 8.0.1 · pillow 12.3.0 ·
uuid6 2025.0.1 · tzdata 2026.3 · starlette 1.3.1`. Dev: `ruff 0.15.22 · mypy 2.3.0 · pytest 9.1.1 ·
pytest-asyncio 1.4.0 · httpx 0.28.1`. **Declared NOT installed** (RV-10/RV-15): aiogram, aiohttp, anthropic,
openai. AI models: body `claude-opus-4-8`; judge/CTA/topic `claude-haiku-4-5`; embeddings 1536/512. Docker:
python:3.13-slim, pgvector/pgvector:pg16, redis:7-alpine, caddy:2-alpine.

### 5.2 Frontend — exact pins (`package.json`)

**Dependencies:** `@radix-ui/react-{dialog 1.1.4, dropdown-menu 2.1.4, scroll-area 1.2.2, toast 1.2.4,
tooltip 1.1.6, select 2.1.4, popover 1.1.4, checkbox 1.1.3, switch 1.1.2, radio-group 1.2.2, tabs 1.1.2,
context-menu 2.2.4, progress 1.1.1, avatar 1.1.2, separator 1.1.1}` · `@tanstack/react-query 5.66.0`
(+devtools) · `@tanstack/react-table 8.20.6` · `@tanstack/react-virtual 3.11.2` · `@visx/{axis,curve,grid,
group,scale,shape} 4.0.0` (the React-19-peer-correct family) · `react-markdown 9.0.3 · remark-gfm 4.0.0 ·
rehype-sanitize 6.0.0 · shiki 1.29.2` · `react-hook-form 7.54.2` · `clsx 2.1.1 · cmdk 1.0.4 · lucide-react
0.474.0 · next 15.1.6 · nuqs 2.3.2 · react/react-dom 19.0.0 · zod 3.24.1 · zustand 5.0.3`.

**Dev:** as at FS1/FS2 (Storybook 8.5.3 on `@storybook/react-vite`, Playwright 1.50.0 + axe, Vitest 3.0.4,
MSW 2.7.0, dependency-cruiser 16.9.0, tailwindcss+@tailwindcss/postcss 4.3.3, typescript 5.7.3, size-limit
11.1.6) **plus `axe-core 4.10.2`** (FS3 per-component harness). Removed on purpose: `@storybook/nextjs`,
`webpack`.

**Still declared-but-not-installed** (arrive with their stages): `date-fns`, Chromatic. **FS5–FS15 added NO
runtime dependencies** — FS10's line diff is hand-written, FS11's range maths uses `Date.UTC` + ISO strings,
and FS12's jsonb diffs, CSV and tables are all hand-written, precisely to keep that record; FS13 added nothing
either — its Radix `switch`/`avatar` were already installed and merely reached a bundle for the first time,
which the R1c measurement admitted; FS14 added nothing either — the observability sink's server half
uses `zod` (already a dependency) and Node's own `fetch`/`crypto`, and the CSP promotion package edits only
`next.config.ts`. **FS15 added nothing to `console/package.json` either** — its two new scripts
(`check-no-secrets.mjs`, `lighthouse-local.mjs`) use only Node built-ins, `@playwright/test` (already a
devDependency) and `npx`-invoked `lighthouse` (not installed as a project dependency; resolved on demand,
exactly like the FS1 postmortem's own tooling calls). Note that **TanStack Table is installed but reaches NO
bundle**: FS12's first-consumer measurement refused it, FS13's re-scan confirmed the sole apparent consumer
is a *comment* explaining why it is unused, and FS14's R1c re-scan (the fourth check) confirmed the same for
both `data-table` and `code-block` — **unchanged at FS15**, since no `src/` file was touched.

**Pinning law (FS1, enforced since):** pin toolchain families together; never float a package with a native
binary.

## 6. Environment configuration *(request item 9)*

```
OS       Windows 11 Home 10.0.26200 · PowerShell + Git-Bash
Node     v22.23.1   pnpm 9.15.9 (corepack)   npm 10.9.8
Python   .venv → 3.14.6
```

**Frontend env:** public — `NEXT_PUBLIC_APP_ENV (local|ci|staging|production, default local)`,
`NEXT_PUBLIC_API_BASE_URL (/api/v1)`, `NEXT_PUBLIC_ENABLE_DEVTOOLS`. **Server (FS4/FS5,
`shared/config/server-env.ts`):** `SESSION_COOKIE_NAME` (*(assumed)* default `session` — FE-RV-7),
`INTERNAL_API_BASE_URL` (default `http://127.0.0.1:8000/api/v1`), `AUTH_FIXTURE_FORCE` (illegal outside
local/ci — build refuses).

**Cookies:** `onyx-theme` · `onyx-density` · `onyx-sidebar` · `onyx-channel` · `onyx-muted-toasts` (FS13 —
the D5-B mirror the toast emitter reads; written only by the preferences module, never holds `danger`) ·
backend session cookie
(opaque, name per env; NEVER parsed client-side) · `onyx-role` (HttpOnly role HINT, BFF-maintained,
reflection only) · `onyx-fixture-scenario` (E2E dataset switch, fixture env only).

**Fixture credentials (local/ci ONLY, public test data):** `owner|admin|editor|analyst|viewer@console.local`
/ `console-demo`. Triple kill-switch keeps every stand-in out of staging/production builds.

## 7. All commands *(request item 18)*

### 7.1 Frontend — from `webplatform/console/`

```bash
corepack enable pnpm && corepack prepare pnpm@9.15.9 --activate
pnpm install                       # --frozen-lockfile in CI
pnpm dev / pnpm build / pnpm start
pnpm gate                          # lint + format:check + typecheck + boundaries + test
pnpm budget                        # next build + machine-checked per-route First Load (≤180 kB)
pnpm size                          # total-JS regression detector (777 kB since FS13; UNCHANGED through the
                                    #   FS14 AND FS15 acceptances — measured 766.23 kB both times; №33)
pnpm test / test:watch / test:coverage
pnpm e2e                           # full matrix; sign-in via the REAL form (fixture accounts above)
pnpm storybook / pnpm build-storybook
node scripts/check-no-secrets.mjs  # FS15 T-FS15.4.1 — run AFTER pnpm build; scans build OUTPUT for
                                    #   credential-shaped patterns; one-off, not wired into ci.yml (D3)
node scripts/lighthouse-local.mjs  # FS15 T-FS15.4.3 — run AFTER `pnpm build && pnpm start`; a WORKSTATION
                                    #   Lighthouse pass only, never staging/production evidence
```

### 7.1b Frontend — from the repo root (`webplatform/`, FS15)

```bash
docker compose -f docker-compose.yml -f webplatform/docker-compose.console.yml --profile app config
                                    # validate the merged overlay BEFORE up — NEVER executed in this
                                    #   environment (no `docker` binary); see PRODUCTION_READINESS_RUNBOOK.md
                                    #   item 1 for the full sequence, including the deferred Caddy route
```

### 7.2 Backend — from the repo root (expectations unchanged)

```bash
.venv/Scripts/pytest.exe -q                 # 466 passed / 6 skipped
.venv/Scripts/python.exe -m mypy            # Success, 385 files, 0 type: ignore
.venv/Scripts/ruff.exe check .              # clean
```

### 7.3 Git verification

```bash
git log --oneline -3        # a8224ec …
git tag -l "stage-*"        # 19 backend tags; NO FS tags
git status --short          # ?? PROJECT_HANDOFF*.md  ?? webplatform/
```

### 7.4 The Windows/pnpm safe order (PART4 §3.1 — 28 corruptions total through FS15; FS15 had none)

```
1. stop any dev/prod server → 2. pnpm install/add/remove (never near a build) →
3. pnpm build (NEVER piped into a truncating filter; the working habit is
   `pnpm build || (pnpm install --force && pnpm build)`) → 4. pnpm start & → 5. pnpm e2e
```

## 8. The most important files to know *(request item 10)*

| File | Why |
|---|---|
| `console/src/shared/config/routes.ts` | ★ THE route registry — sidebar/palette/middleware/breadcrumbs/stubs |
| `console/src/shared/config/shortcuts.ts` | ★ keyboard registry — handlers AND the `⌘/` cheat-sheet |
| `console/src/shared/types/status.ts` | ★ 12-status vocabulary + `parseStatus` — register first, then use |
| `console/src/shared/ui/tone.ts` + `ui/README.md` | ★ typed text-tone rule + the component-API convention |
| `console/src/styles/tokens.css` | ONYX tokens, both themes — **values frozen** |
| `console/src/shared/lib/auth-gateway/*` | FS4 auth seam; `map.ts` = the FE-RV-7 adjustment point |
| `console/src/shared/lib/fixtures/*` | FS5 data seam; `dataset.ts` = the one deterministic dataset |
| `console/src/app/api/auth/*` | BFF cookie handling — RAW set-cookie appends ONLY (see auth.ts warning) |
| `console/scripts/check-route-budget.mjs` | the per-route budget gate |
| `console/src/entities/{platform-user,config-version,audit,job-queue,probe,api-key,cost-report}/{model,paths,keys}.ts` | FS12 platform seams; the FE-RV-15 adjustment points — and the reference case for **rooting a key hierarchy AWAY from an existing prefix** (`['queue', …]`, never `'jobs'`, because three shipped features invalidate the bare `['jobs']`) |
| `console/src/features/rotate-key/model/useRotateKey.ts` | ★ the ONLY place a secret legally exists — a request body. Read it with `tests/unit/secret-writeonly.test.ts` beside it: together they are how "write-only" stops being a convention |
| `console/src/features/requeue-job/ui/QueueIntentActions.tsx` | ★ why a `useMutation` hook belongs INSIDE the lazy component: calling it from the eager view cost `/jobs` 11 kB and the budget gate |
| `console/src/widgets/inspector/PlatformInspectors.tsx` | ★ why N lazy `dynamic()` rows of one family become ONE chunk — the runtime chunk-id map lives in commons |
| `console/src/widgets/platform-seams/index.tsx` | ★ the shape of a VERIFIED ABSENCE screen: fact · reason · remedy, real navigation (the a11y fix), zero fixture data |
| `console/src/entities/analytics-report/{report-model,report-hooks,paths,keys}.ts` | FS11 analytics seams; the FE-RV-14 adjustment points — and the reference case for **why a `'use client'` module must not be re-exported from a slice another screen imports** |
| `console/src/features/explain-metrics/model/buildMetricsPrompt.ts` | ★ the pure metrics prompt (unit-proven: only the loaded NON-GATED values + filters; forbids causes, anomalies, forecasts and engagement claims) |
| `console/src/widgets/analytics/PanelFrame.tsx` | ★ where §R11.9 is made unavoidable — no panel renders without stating endpoint · filters sent · fetched-at · algorithm version *only if the wire carries one* |
| `console/src/features/change-settings/model/preferences.ts` | ★ THE single storage toucher of the account surface — and the reason a preferences endpoint would be a one-file swap (FE-RV-16). Read it with `shared/lib/notifications/muted-toasts.ts` beside it: together they are why the D5-B read side had to sit in commons |
| `console/src/shared/lib/notifications/muted-toasts.ts` | ★ the measured cause of the accepted FS13 I2 deviation, and the standing example that **FSD placement can force a commons byte**: a provider may not import a feature, so state consulted inside the frozen seven has its read side here |
| `console/src/widgets/profile/{identity.ts,useMyActivity.ts}` | ★ why `entities/session` was NOT extended (it is in every route's First Load via `AuthProvider`), and the privacy lock: a **non-nullable** actor, because `auditPaths.list` drops a falsy one and would widen a personal feed to the platform-wide log |
| `console/src/instrumentation.ts` + `console/src/app/api/telemetry/route.ts` | ★ the observability seam as it actually shipped — SERVER-ONLY by owner ruling; the client half was built, measured in two placements, cost three protected routes 1 kB each in both, and was removed. Read them with `console/src/app/global-error.tsx` beside them: together they are the whole client-visible surface of Stage 2 §11 today |
| `console/next.config.ts` | ★ the CSP promotion package — the enforced header is authored as a constant and never sent; a unit test asserts the response still carries the Report-Only key, so a future edit cannot silently promote it |
| `console/tests/e2e/journeys.spec.ts` | ★ the D3 Part C journey inventory — one file, so every cross-screen chain has one home; every hop asserts a WIRE fact, never a bare URL change |
| `webplatform/frontend/PRODUCTION_READINESS_RUNBOOK.md` | ★ **the standing procedure, not a stage narrative** — ten numbered items for every open FE-RV (Docker, CI, the five infra-gated FS1-postmortem-§7 items, CSP enforcement, staging Lighthouse, and the one session that closes FE-RV-7…16 together), each with its exact command sequence and single adjustment point |
| `webplatform/docker-compose.console.yml` | ★ the FS15 Docker Compose overlay — wires the FS1 Dockerfile into the deployment topology WITHOUT touching root `docker-compose.yml`/`docker/Caddyfile`; read its own header comments for the one deferred Caddy-route step |
| `console/scripts/check-no-secrets.mjs` | ★ FS15's secrets-in-bundle scanner — read its header for why `node_modules` is excluded (a real false positive inside Next's own vendored WASM, not a weakened check) |
| `console/scripts/lighthouse-local.mjs` | ★ FS15's local Lighthouse runner — read its header for why it drives a Playwright-launched Chromium over CDP rather than a direct `chrome-launcher` spawn (which fails here with a WinSxS error), and why `--extra-headers` is a file path, not inline JSON |
| `console/tests/unit/gated-fields-audit.test.ts` | ★ FS15's cross-cutting §R10.3 proof — every gated-capable surface this project has shipped, proven in one place by exercising the real production functions |
| `webplatform/frontend/FS15_REPORT.md` + `FS15_REPORT_SIZE_ADDENDUM.md` | **the terminal stage's truth** — the environment-verification finding (`docker`/`gh`/`act` absent), the two real tooling bugs found and fixed, the Lighthouse workstation numbers with their caveat, and the owner's ruling that no size-limit action was needed |
| `webplatform/frontend/FS13_REPORT.md` + `FS13_REPORT_SIZE_ADDENDUM.md` | the account surface, the three decision gates, the four builds behind the accepted I2 deviation, and the 777 kB ruling |
| `webplatform/frontend/FS14_REPORT.md` + `FS14_REPORT_SIZE_ADDENDUM.md` | the five journeys, the observability client-sink refusal (measured twice), the font pin closing FE-RV-5, the CSP package, the progressive-disclosure rollout and refusals, and the owner's ruling that no size-limit re-baseline was needed |
| `webplatform/frontend/FS12_REPORT.md` + `FS12_REPORT_SIZE_ADDENDUM.md` | the prior stage's truth — the nine-route governance surface, the DataTable refusal, the two a11y fixes, the two control builds behind I1/I2, and the 756 kB ruling |
| `webplatform/frontend/FS11_REPORT.md` + `FS11_REPORT_SIZE_ADDENDUM.md` | the prior stage's truth + the bundle analysis behind the 696 kB ruling, incl. the two control builds and the R1c before/after measurement |
| `webplatform/frontend/FS10_REPORT.md` + `FS10_REPORT_SIZE_ADDENDUM.md` | the prior stage's truth + the full bundle analysis behind the 677 kB ruling, incl. the two control-build proofs and the owner's requirements A/B (FS6–FS9 report/addendum pairs remain the prior precedents; `FS9_REPORT.md` + `FS9_REPORT_SIZE_ADDENDUM.md` carry the 655 kB ruling and the I2 proof) |
| `console/src/entities/image/{model,paths,keys}.ts` + `entities/location/*` | FS9 image seams; the FE-RV-12 adjustment points — and the reference implementation of ENTITY-LOCAL QUERY KEYS (zero commons rows) |
| `console/src/entities/prompt/{model,paths,keys}.ts` | FS10 prompt seams; the FE-RV-13 adjustment points — and the reference implementation of a **CHANNEL-FREE** entity (no builder may accept a `channelId`; lock-tested by arity) |
| `console/src/features/manage-prompt/model/promptDraft.ts` | ★ the ONLY storage toucher on the prompt surface (the ConversationRepository discipline at feature scale) |
| `console/src/features/test-prompt/model/buildPromptRun.ts` | ★ the pure single-version prompt run (unit-proven: that version's text + the user's sample and nothing else) |
| `console/src/features/explain-verification/model/buildImagePrompt.ts` | ★ the pure single-image prompt (provenance guarantee; forbids safety/identity/uniqueness claims, unit-proven) |
| `console/src/entities/{persona,actor}/{model,paths}.ts` | FS8 memory seams; the FE-RV-11 adjustment points |
| `console/src/features/explain-style/model/buildPersonaPrompt.ts` | ★ the pure single-persona prompt (provenance guarantee, unit-proven) |
| `console/src/shared/config/shortcuts-catalog.ts` | the display side of the keyboard registry — must stay OUT of commons (T-FS8.1, lock-tested) |
| `console/src/entities/document/{model,paths}.ts` | FS7 knowledge seam; the FE-RV-10 adjustment points |
| `console/src/features/ask-document/model/buildDocumentPrompt.ts` | ★ the pure single-document prompt (provenance guarantee, unit-proven) |
| `console/src/shared/lib/api/boot-gate.ts` | FS7 transport gate — why the first fetch cannot race the fixture worker |
| `console/src/entities/conversation/repository.ts` | ★ THE ConversationRepository — the single storage toucher and future-API swap point (owner condition) |
| `console/src/shared/lib/ai-gateway/*` | FS6 AI seam; `real.ts` = the FE-RV-9 adjustment point (verbatim relay) |
| `webplatform/frontend/FS*_REPORT.md`, `FS1_POSTMORTEM.md` | per-stage truth: decisions, defects, FE-RV |
| `MASTER_SPEC.md` / `API_SPEC.md` | backend SoT / the frozen contract the frontend adapts to |

---

*Continue with `PROJECT_HANDOFF_PART4.md` (method, registers, backlog, known problems, git, next steps).*
