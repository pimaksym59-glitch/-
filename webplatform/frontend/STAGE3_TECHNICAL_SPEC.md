# Stage 3 — Frontend Technical Specification (v1.0)

**Track:** Web Platform · **SoT:** `FRONTEND_MASTER_SPEC.md` · implements Stage 2 architecture at file level.
**No code.** Goal: after this spec, implementation proceeds **without further architecture decisions**.
Consumes the frozen backend via `/api/v1` (`API_SPEC.md`) — no backend change; ONYX v1.0 + backend freezes
intact. After approval → disciplined implementation (FS1…FS15). **Awaiting approval; nothing implemented.**

**Legend.** Layer: `shared/ui`=U · `entities`=E · `features`=F · `widgets`=W · `app`=A. Runtime: **S**=Server
Component-capable · **C**=Client (`"use client"`). Tokens = ONYX **semantic** set unless a specific one is
noted. "*(assumed)*" = UI view whose exact endpoint is finalized against the contract in FS-Infrastructure —
no backend redesign.

---

## 1. Full file map

```
console/                                   # frontend repo (separate service; own Docker image)
├─ public/                                 # static assets, self-hosted fonts, favicon, og image
│  └─ fonts/                               # Inter.woff2, JetBrainsMono.woff2 (next/font/local)
├─ .storybook/                             # Storybook config (main.ts, preview.tsx, theme decorators)
├─ tests/
│  ├─ e2e/                                 # Playwright specs (journeys D3 Part C) + axe checks
│  ├─ msw/                                 # MSW handlers + fixtures (deterministic)
│  └─ setup/                               # vitest.setup.ts, rtl helpers, test tokens
├─ src/
│  ├─ app/                                 # Next App Router — THIN (routing/layout/metadata only)
│  │  ├─ layout.tsx                        # root: <html>, providers, theme/density from cookie
│  │  ├─ providers.tsx                     # client provider tree (§7)
│  │  ├─ globals.css                       # imports styles/tokens.css + base
│  │  ├─ middleware.ts                     # route protection (auth/RBAC redirects)  [repo root in Next]
│  │  ├─ (public)/{landing,login,register}/{page.tsx,layout.tsx}
│  │  ├─ (workspace)/
│  │  │  ├─ layout.tsx                      # AppShell + session guard + @inspector slot
│  │  │  ├─ dashboard/page.tsx
│  │  │  ├─ chat/[[...id]]/{page.tsx,loading.tsx,error.tsx}
│  │  │  ├─ knowledge/[[...docId]]/…        # + memory, studio, prompts, playground, analytics, channels
│  │  │  └─ @inspector/{default.tsx,[entity]/page.tsx}   # parallel route → Universal Inspector
│  │  ├─ (platform)/{admin,providers,health,jobs,logs,audit,flags,billing,notifications}/…
│  │  ├─ (account)/{settings,profile,docs}/…
│  │  └─ api/                              # route handlers: /auth proxy, /stream (SSE relay), /config
│  ├─ widgets/                             # screen-level composition (index.ts public per slice)
│  │  ├─ app-shell/ · sidebar/ · topbar/ · inspector/ · command-palette/ · notifications-center/
│  │  └─ {dashboard,chat,knowledge,memory,studio,prompts,playground,analytics,channels,admin,…}-view/
│  ├─ features/                            # user actions (index.ts public per slice)
│  │  ├─ auth/ · send-message/ · compose-post/ · publish-post/ · schedule-post/ · add-source/
│  │  ├─ retrieval-preview/ · explain-memory/ · generate-image/ · manage-prompt/ · run-playground/
│  │  ├─ filter-analytics/ · export-analytics/ · requeue-job/ · manage-users/ · rotate-key/
│  │  ├─ toggle-flag/ · rollback-config/ · manage-notifications/ · change-settings/ · ask-ai/
│  ├─ entities/                            # domain model + its hooks/ui/mappers (index.ts public)
│  │  ├─ channel/ · conversation/ · message/ · document/ · memory/ · image/ · prompt/ · job/
│  │  ├─ user/ · provider/ · audit/ · flag/ · notification/ · analytics/ · health/ · log/ · billing/
│  │  └─ session/                          # each: model.ts, api.ts, hooks.ts, selectors.ts, ui/, index.ts
│  ├─ shared/
│  │  ├─ ui/                               # ONYX component library (atoms + compounds + ai/)
│  │  │  ├─ button/ input/ select/ badge/ card/ tabs/ dialog/ menu/ popover/ tooltip/ toast/
│  │  │  ├─ table/ metric-card/ chart/ markdown/ code-block/ file-upload/ avatar/ timeline/
│  │  │  ├─ empty-state/ error-state/ skeleton/ command-palette/ drawer/ filter-bar/ …
│  │  │  └─ ai/                            # StreamingMessage, ThinkingState, ToolCall, Citation, …
│  │  ├─ lib/
│  │  │  ├─ api/                           # apiFetch, endpoints, error-normalize, correlation-id
│  │  │  ├─ query/                         # queryClient, keys, defaults, persist
│  │  │  ├─ stream/                        # openStream (SSE-over-fetch), reconcile
│  │  │  ├─ rbac/                          # can(role, permission), matrix mirror
│  │  │  ├─ errors/                        # AppError, mapping to recovery
│  │  │  └─ format/                        # dates, numbers (tnum), bytes, cost
│  │  ├─ hooks/                            # cross-cutting hooks (§6)
│  │  ├─ config/                           # routes.ts, rbac.ts, env.ts, query-keys.ts, tokens.ts
│  │  ├─ types/                            # DTO mirrors, ViewModels, shared enums (Status vocabulary)
│  │  └─ providers/                        # provider components (§7)
│  ├─ styles/                             # tokens.css (ONYX vars, both themes), themes.css, base.css
│  └─ instrumentation.ts                   # web-vitals + error sink bootstrap (client)
├─ next.config.ts · tsconfig.json · tailwind.config.ts · postcss.config.js
├─ eslint.config.js · .prettierrc · dependency-cruiser.config.js · vitest.config.ts · playwright.config.ts
├─ size-limit.config.js · Dockerfile · .env.example · package.json · pnpm-lock.yaml
```

**Directory purpose (brief):** `app` = routing/layout/metadata only (thin). `widgets` = whole-screen
composition. `features` = one user action + its data. `entities` = a domain object + hooks/mappers/UI.
`shared/ui` = the ONYX design system in code. `shared/lib` = api/query/stream/rbac/errors/format. `shared/
config` = routes/rbac/env/keys/tokens. `shared/types` = DTO mirrors + ViewModels + Status enum. `providers` =
the provider tree. `styles` = ONYX tokens + themes. `tests`/`.storybook` = the gate tooling.

## 2. Component Inventory (`shared/ui` + AI)

| Component | Layer | S/C | Deps | Tokens | AI | APIs | Hooks | States |
|---|---|---|---|---|---|---|---|---|
| Button / IconButton | U | S/C | — | interactive.*, ai.* (AI variant) | — | — | — | default/hover/active/focus/disabled/loading |
| Input / Textarea | U | C | — | surface.inset, border, danger | — | — | useControllableState | default/focus/invalid/disabled/readonly |
| Select / Combobox | U | C | Radix Select/Popover | surface.overlay, border | — | — | useDisclosure | + async/loading/multi |
| Checkbox / Switch / Radio | U | C | Radix | interactive.* | — | — | — | on/off/indeterminate/disabled |
| Badge / **StatusBadge** | U | S | — | status.* | — | — | — | per Status vocabulary (D2 §11) |
| Card / MetricCard | U | S | — | surface.raised, status.* (delta) | ○ | — | — | static/interactive/selectable/loading |
| Tabs | U | C | Radix Tabs | interactive underline | — | — | — | selected/hover/disabled |
| Dialog / Drawer / Sheet | U | C | Radix Dialog | surface.overlay, glass, scrim | ○ | — | useFocusReturn | open/closed |
| Menu / ContextMenu / Dropdown | U | C | Radix Menu | surface.overlay | ○ | — | useRovingTabIndex | + submenu/disabled |
| Popover / Tooltip | U | C | Radix | surface.overlay | — | — | — | open/closed |
| Toast / Toaster | U | C | Radix Toast | status.*, ai (AI kind) | ○ | — | useToast, useAnnouncer | enter/persist/exit |
| Table / DataTable / Pagination | U | C | TanStack Table+Virtual | border.subtle, tnum | ○ | (via feature) | useVirtualizer | empty/loading/error/rows/selected |
| CommandPalette | U | C | cmdk, Radix Dialog | glass, interactive.subtle | ● (`/` Ask AI) | search (via feature) | useCommandPalette, useShortcuts | open/results/empty |
| FilterBar / SearchInput / SegmentedControl | U | C | — | chip, interactive.subtle | — | — | useDebounce | — |
| Markdown | U | S | react-markdown, rehype-sanitize | body.lg, callouts | ● (citations) | — | — | — |
| CodeBlock | U | S | Shiki | bg.sunken, viz | — | — | useCopyToClipboard | + diff/copy |
| Chart (Line/Area/Bar/Sparkline/Donut) | U | C | visx | viz.*, border.subtle | ○ (explain) | (data via feature) | — | empty/loading/error |
| FileUpload | U | C | — | border.strong (dashed) | ○ | ingest (feature) | useDropzone | idle/uploading/error/verified |
| Avatar / AvatarGroup | U | S | — | muted tints | — | — | — | image/initials/presence |
| Timeline / ActivityFeed | U | S | — | status.*, border.subtle | ○ | (via widget) | — | empty/loading |
| EmptyState / ErrorState / Skeleton / Spinner | U | S/C | — | text.tertiary | — | — | — | (the states themselves) |
| Kbd / Breadcrumbs / Divider / ProgressBar / ScrollArea | U | S | Radix ScrollArea | border, text.tertiary | — | — | — | — |
| **AI: StreamingMessage** | U/ai | C | Markdown, caret | ai.accent, aurora | ● | (stream via feature) | useAssistantStream, useAnnouncer | thinking/streaming/done/error |
| **AI: ThinkingState** | U/ai | C | — | aurora shimmer | ● | — | — | active |
| **AI: ToolCall** | U/ai | C | — | surface.inset, status.* | ● | — | — | running/completed/failed |
| **AI: Citation** | U/ai | C | Popover | ai.wash | ● | knowledge/memory | useInspector | idle/hover/open |
| **AI: MemoryCard / KnowledgeCard** | U/ai | S/C | Card | ai.accent | ● | memory/knowledge | — | default/loading |
| **AI: ImageResult** | U/ai | C | Card, VerificationBadge | status.*, aurora | ● | images | — | generating/verified/needs-review/failed |
| **AI: PromptCard** | U/ai | S | Card, Badge | interactive.* | ● | prompts | — | active/draft |
| **AI: VerificationBadge / TrustLabel / ExplainabilityPanel** | U/ai | S | Badge | status.success/warning, ai | ● | — | — | generated/verified/needs-review/source/no-source |
| **AI: AIComposer / AIActionButton** | U/ai | C | Button, Select | ai.wash, aurora | ● | ai (feature) | useAskAI | idle/streaming/stopped |

## 3. Feature Inventory (`features/*`)

| Feature | Boundaries (owns) | Public API (`index.ts`) | Internal deps | Related entities | Related workspace/screen |
|---|---|---|---|---|---|
| auth | login/register/logout, session bootstrap | `LoginForm`, `RegisterFlow`, `useLogin/useLogout` | shared/lib(api), rhf+zod | session, user | Login, Register |
| send-message | compose+stream an AI turn, message actions | `Composer`, `useSendMessage` | stream, ai | conversation, message | AI Chat, Playground |
| compose-post | start the 5-stage pipeline from a prompt | `ComposeButton`, `useCompose` | send-message, generate-image | channel, message, image | Dashboard, Channels, Chat |
| publish-post / schedule-post | publish/schedule (queue intents §R10.1) | `PublishAction`, `usePublish` | api | channel, job | Channels, Review, Dashboard |
| add-source | upload+ingest KB docs | `AddSource`, `useIngest` | file-upload, stream | document | Knowledge |
| retrieval-preview | query → chunks the AI would retrieve | `RetrievalPreview`, `useRetrieve` | ai | document | Knowledge |
| explain-memory | trace post ← memory/knowledge | `ExplainTrace`, `useExplain` | ai | memory, message | Memory |
| generate-image | prompt→generate→verify→attach | `GeneratePanel`, `useGenerateImage` | stream, file-upload | image | Image Studio |
| manage-prompt | new/version/diff/promote | `PromptEditor`, `usePrompt*` | rhf+zod | prompt | Prompt Library |
| run-playground | dry-run + compare models | `PlaygroundRunner`, `useRun` | stream, ai | prompt, provider | AI Playground |
| filter-analytics / export-analytics | range/channel filter + export | `AnalyticsFilters`, `useAnalyticsQuery` | nuqs, chart | analytics | Analytics, Billing |
| requeue-job | DLQ requeue intent + retry | `RequeueAction`, `useRequeue` | api | job | Jobs |
| manage-users | invite/set-role/deactivate/revoke-session | `UsersTable`, `useUser*` | rhf, rbac | user, session | Admin, Profile |
| rotate-key | write-only key rotation | `KeyRotate`, `useRotateKey` | api (write-only) | provider | Providers, Admin |
| toggle-flag / rollback-config | flags + config versions | `FlagToggle`, `ConfigHistory` | api | flag | Feature Flags, Admin |
| manage-notifications | read/mute/prefs | `NotifList`, `useNotif*` | api | notification | Notifications |
| change-settings | theme/density/experience/security | `SettingsPanels`, `useSettings` | store, rhf | session, user | Settings, Profile |
| ask-ai | contextual AI on any screen (`/`) | `AskAI`, `useAskAI` | send-message, stream | — | all screens (D3 A5) |

**Rules:** features never import other features (compose via widgets); each exposes only its `index.ts`; a
feature owns its Query/mutation hooks + Zod schemas; RBAC gate via `can()` before any mutation.

## 4. Entity Inventory (`entities/*`)

Each entity = `model.ts` (DTO + ViewModel + Zod), `api.ts` (endpoint calls + mappers), `hooks.ts` (queries +
mutations), `selectors.ts`, `ui/`, `index.ts`. DTO mirrors `API_SPEC.md`/public DTO; ViewModel is the UI-shaped
projection (secrets dropped, Status normalized).

| Entity | DTO (from backend) | ViewModel (UI shape) | Query hooks | Mutation hooks | Selectors | Utilities |
|---|---|---|---|---|---|---|
| channel | ChannelDTO (+bot_token_ref) | ChannelVM (no secret, health, schedule) | useChannels, useChannel | useCreate/useRename/usePause/useConnectBot | activeChannel, byStatus | rateLimitKey, statusOf |
| conversation | ConversationDTO | ConversationVM (title, snippet, model, cost) | useConversations, useConversation | useRename/usePin/useDelete | recent, pinned | fmtTime |
| message | MessageDTO | MessageVM (+trust, citations, tool calls) | (streamed) useMessages | useRetry/useBranch/useInsert | lastAssistant | parseCitations |
| document | DocumentDTO + ChunkDTO | DocumentVM, ChunkVM (score) | useDocuments, useDocument, useChunks | useIngest/useDelete/useExclude | bySource | fmtBytes |
| memory | MemoryEntryDTO (scope/kind/features) | MemoryVM (+influence) | useMemory, useTrace | useEditEntry(guarded) | byScope/byKind | scopeLabel |
| image | ImageRequestDTO + ResultDTO | ImageVM (+verification chips, seed) | useImages, useImage | useGenerate/useRegenerate/useAttach | verified/needsReview | aspectLabel |
| prompt | PromptDTO + VersionDTO | PromptVM, VersionVM (+active, diff) | usePrompts, usePrompt, useVersions | useNewVersion/usePromote | activeVersion | diffVersions |
| job | TaskDTO (status/attempts/error) | JobVM (Status vocabulary, stage) | useJobs, useJob | useRequeue/useRetry | failed/needsReview | classifyError |
| user | UserDTO (+password_hash) | UserVM (no secret, mfa_enabled) | useUsers, useUser | useInvite/useSetRole/useDeactivate | byRole | roleLabel |
| provider | ProviderDTO (+api_key_ref) | ProviderVM (no key, capabilities, health) | useProviders, useProvider | useRotateKey/useToggle | byKind, healthy | capBadges |
| audit | AuditRecordDTO (before/after) | AuditVM (diff) | useAudit, useAuditRecord | — (read-only) | byActor/byEntity | diffJson |
| flag | FeatureFlagDTO | FlagVM | useFlags, useFlag | useToggle | enabled | — |
| notification | NotificationDTO | NotifVM (kind, unread) | useNotifications | useMarkRead/useMute | unread, byKind | kindIcon |
| analytics | SnapshotDTO/UsageDTO | MetricVM (available/gated) | useAnalytics, useCost | — | reliablePanels, gated | fmtCost, delta |
| health | ProbeDTO | ProbeVM (state) | useHealth | useRecheck | overall, failing | dotColor |
| log | LogEntryDTO (json) | LogVM | useLogs (+tail) | — | byLevel | mask(secrets) |
| billing | UsageDTO | BillingVM (forecast est.) | useBilling | useSetBudget | byProvider | fmtMoney |
| session | SessionDTO | SessionVM (device, current) | useSession, useSessions | useRevoke/useRevokeAll | current | — |

## 5. Routing Map (App Router)

| Route | Layout | RBAC | Loading | Error | Streaming | Inspector | SEO / Metadata |
|---|---|---|---|---|---|---|---|
| `/` (landing) | public | public | static | boundary | — | — | indexable; OG title/desc/image |
| `/login` `/register` | public | public | — | inline | — | — | noindex; title only |
| `/dashboard` | workspace | role-scoped | skeleton | segment | live counters | ✓ item | private; noindex |
| `/chat/[[...id]]` | workspace | Editor+ | skeleton | segment | **SSE tokens** | ✓ sources | noindex |
| `/knowledge/[[...docId]]` | workspace | Editor/Admin | skeleton | segment | ingest/retrieval | ✓ chunk | noindex |
| `/memory/[[...scope]]` | workspace | Editor/Admin(r Analyst) | skeleton | segment | trace | ✓ entry | noindex |
| `/studio/[[...id]]` | workspace | Editor/Admin | skeleton | segment | generation | ✓ result | noindex |
| `/prompts/[[...path]]` | workspace | Editor/Admin | skeleton | segment | AI refine | ✓ version | noindex |
| `/playground` | workspace | Editor/Admin/Owner | skeleton | segment | dry-run | ✓ run | noindex |
| `/analytics` | workspace | read all | chart skeleton | segment | live counters | ✓ datapoint | noindex |
| `/channels/[[...id]]` | workspace | Owner/Admin(Editor content) | skeleton | segment | publish/health | ✓ connection | noindex |
| `/admin/*` | platform | Owner(+Admin subset) | skeleton | segment | session state | ✓ user/config | noindex |
| `/providers` | platform | Owner(Admin r) | skeleton | segment | health | ✓ provider | noindex |
| `/health` | platform | Owner/Admin | skeleton | segment | probe state | ✓ probe | noindex |
| `/jobs` | platform | Owner/Admin | skeleton | segment | **transitions** | ✓ task | noindex |
| `/logs` | platform | Owner/Admin | skeleton | segment | **tail** | ✓ entry | noindex |
| `/audit` | platform | Owner/Admin/Analyst | skeleton | segment | — | ✓ diff | noindex |
| `/flags` | platform | Owner/Admin | skeleton | segment | — | ✓ flag | noindex |
| `/billing` | platform | Owner(Analyst r) | skeleton | segment | live spend | ✓ line-item | noindex |
| `/notifications` | platform | all (own) | skeleton | segment | incoming | ✓ item | noindex |
| `/settings/*` | account | personal/all | instant | inline | — | ✓ help | noindex |
| `/profile` | account | self | skeleton | segment | session | ✓ session | noindex |
| `/docs/[[...slug]]` | account | public (runbooks scoped) | skeleton | segment | AI answer | ✓ TOC | indexable (public docs) |

Middleware protects `(workspace)`/`(platform)`/`(account)` (redirect to `/login?next=`); server layouts
re-check session; the `@inspector` parallel slot renders `?inspect=type:id` as a drawer (desktop) / sheet
(mobile) without navigation.

## 6. Hook Inventory (custom hooks)

| Group | Hooks |
|---|---|
| **UI** | useDisclosure · useInspector · useDensity · useExperienceLevel · useMediaQuery · useToast · useSegmented · useControllableState |
| **AI** | useAskAI · useExplain · useTrust · useAIActions (copy/retry/branch/insert) |
| **API** | per-entity `use<Entity>(s)` queries + `use<Action>` mutations (§4); useInfinite(list); usePrefetch |
| **Streaming** | useAssistantStream · useGenerationStatus · useLogTail · useJobStream · useIngestProgress |
| **Keyboard** | useShortcuts (global map D1 §6.5) · useHotkey · useCommandPalette · useGChord |
| **Theme** | useTheme · useThemePreference (cookie, SSR) |
| **Accessibility** | useAnnouncer · useFocusReturn · useFocusTrap · useReducedMotion · useRovingTabIndex · useSkipLink |
| **Utilities** | useDebounce · useLocalStorage · useDraft · useOnlineStatus · useCopyToClipboard · useIntersection · useVirtualizer · useCorrelationId |

**Rules:** hooks are pure/isolated, unit-tested; API hooks wrap TanStack Query with a consistent key + error
contract; streaming hooks own an `AbortController` and reconcile into the cache on completion.

## 7. Provider Inventory & nesting

Order (outer → inner) and responsibility:

1. **ThemeProvider** — reads theme/density from cookie (SSR, no FOUC); sets `data-theme`/density; exposes
   `useTheme`. *Outer so tokens exist before anything renders.*
2. **QueryProvider** — TanStack `QueryClient` (defaults: staleTime/gcTime/retry), persistence, devtools (dev).
3. **AuthProvider** — hydrates read-only session (user, role) from server; exposes `useSession`, `can()`;
   depends on Query.
4. **AccessibilityProvider** — mounts the live-region announcer + reduced-motion/contrast context.
5. **ShortcutProvider** — global keyboard map + command-palette open state; needs Auth (RBAC-filtered actions).
6. **NotificationProvider** — Radix Toaster + notifications stream subscription; needs Announcer (a11y).
7. **StreamingProvider** — shared stream registry (active streams, Stop-all), correlation-id source.

```
<ThemeProvider>
  <QueryProvider>
    <AuthProvider>
      <AccessibilityProvider>
        <ShortcutProvider>
          <NotificationProvider>
            <StreamingProvider>{children}</StreamingProvider>
```
All are `"use client"` and mounted once in `app/providers.tsx`; server layouts pass server-fetched session +
theme cookie down so the client tree hydrates without flashes.

## 8. API Layer (per endpoint group)

Contract source: `API_SPEC.md`. Each call: typed **Request/Response DTO** → **Mapper** to ViewModel →
**Query Key** → cache/retry/invalidate. Streaming marked. *(assumed)* endpoints finalized in FS1 against the
contract; none require backend change.

| Endpoint group | Request → Response DTO | Mapper | Query key | Stream | Cache | Retry | Invalidate on |
|---|---|---|---|---|---|---|---|
| `POST /auth/login` `/logout` `GET /auth/me` `POST /auth/sessions/revoke` | Credentials → {user,role}/204 | →SessionVM | `['session']` | — | session cache | none (auth) | login/logout → session, all |
| `GET/POST /channels` `PATCH /channels/:id` | ChannelDTO | →ChannelVM (drop token ref) | `['channels', ch]` | — | 30s SWR | 4xx-skip | create/rename/pause → channels |
| content/posts (`§R5/§R7.8`, queue) | PostDTO / 202 intent | →MessageVM | `['posts', ch, filters]` | publish status (poll) | 15s | 4xx-skip | publish/schedule → posts, jobs |
| `POST /images` + verify (`§R6`) | ImageRequest → ResultDTO | →ImageVM (chips) | `['images', ch]` | **generation SSE** | recent | 4xx-skip | generate/attach → images |
| knowledge (`GET/POST /knowledge`, ingest, retrieve) | DocumentDTO/ChunkDTO | →DocumentVM/ChunkVM | `['docs', ch]` `['chunks', doc]` | **ingest/retrieval SSE** | source list 60s | 4xx-skip | ingest/delete → docs |
| `prompts` (versioned §R10.6) | PromptDTO/VersionDTO | →PromptVM/VersionVM | `['prompts']` `['versions', name]` | AI refine SSE | prompts 60s | 4xx-skip | new-version/promote → prompts |
| scheduler/tasks (`§R8`) | TaskDTO | →JobVM | `['jobs', filters]` | **transitions** (poll/SSE) | 15s | 4xx-skip | requeue/retry → jobs |
| `GET /analytics` (+cost) | SnapshotDTO/UsageDTO | →MetricVM (gated flag) | `['analytics', range, ch]` | live counters | range-keyed | 4xx-skip | — (read) |
| ai-studio (dry-run §R10.9) | PromptRun → outputs | →RunVM | `['playground', hash]` | **dry-run SSE** | none | none | — |
| `GET/POST /users`, sessions, config | UserDTO/ConfigDTO | →UserVM (no secret) | `['users']` `['config']` | session health | lists 30s | 4xx-skip | invite/role/config → users/config, audit |
| providers *(assumed via services)* | ProviderDTO | →ProviderVM (no key) | `['providers']` | health | 30s | 4xx-skip | rotate/toggle → providers |
| `GET /health` | ProbeDTO | →ProbeVM | `['health']` | probe state | 10–30s poll | retry | recheck → health |
| logs *(assumed)* | LogEntryDTO | →LogVM (mask) | `['logs', filters]` | **tail SSE** | last query | none | — |
| `GET /audit-log` | AuditRecordDTO | →AuditVM | `['audit', filters]` | — | records | 4xx-skip | — |
| flags/notifications/billing *(assumed)* | respective DTOs | →VMs | `['flags']`/`['notifs']`/`['billing']` | notifs incoming | varies | 4xx-skip | toggle/mark → respective |

**Global API rules:** `credentials:'include'`; `X-Request-Id` correlation header; `AbortSignal` on every call;
errors normalized to `AppError` (§Stage2 §4) and mapped to recovery (D4 §8); mutations are optimistic only when
safe/reversible (`useOptimistic`), else confirmed; secrets are write-only (never in a response VM).

## 9. Build Specification (config principles)

| Tool | Principles |
|---|---|
| **tsconfig** | `strict:true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, path aliases (`@/shared`, `@/entities`…), `moduleResolution:bundler`, `verbatimModuleSyntax`. 0 unjustified `any`. |
| **ESLint** (flat) | `typescript-eslint` strict + stylistic, `jsx-a11y` recommended, `import` + **`dependency-cruiser`/boundaries** enforcing FSD direction, `react-hooks`, no default exports in slices (named public API). |
| **Prettier** | 2-space, width 100, single-quote, trailing comma; runs pre-commit; no formatting debates. |
| **Tailwind v4** | `@theme` maps ONYX **semantic tokens** (from `styles/tokens.css`) to utilities; no raw hex in markup; content globbed to `src`; dark/light via `data-theme`. |
| **PostCSS** | Tailwind v4 plugin + autoprefixer + nesting; tokens.css imported first. |
| **Storybook 8** | per-component stories with all states + both themes + density decorators; a11y addon; Chromatic for visual regression baseline (the Preview). |
| **Vitest** | jsdom, RTL, `@testing-library/jest-dom`, MSW server in setup; coverage thresholds (lines ≥85%, shared/lib higher); deterministic (fixed clock/seed). |
| **Playwright** | projects for desktop/tablet/mobile viewports + dark/light; `@axe-core/playwright` a11y assertions; journeys from D3 Part C; runs against a mocked or staging build. |
| **MSW** | handlers per endpoint group (§8) with deterministic fixtures; shared between component/integration tests and Storybook; mirrors `API_SPEC.md` shapes. |
| **next.config / size-limit / Dockerfile** | `output:'standalone'`; self-hosted fonts; CSP headers; `size-limit` per route-group budgets (§Stage2 §9); Docker node:alpine, non-root, healthcheck. |

## 10. Engineering Readiness Checklist (implementation may start when all ✓)

- [ ] File map (§1) scaffolded; FSD layers + `index.ts` public interfaces in place; boundary lint wired.
- [ ] ONYX `tokens.css` (both themes) + Tailwind `@theme` map complete; theme/density SSR (cookie) verified.
- [ ] Provider tree (§7) mounted in `app/providers.tsx`; nesting/responsibilities as specified.
- [ ] `shared/lib`: `apiFetch`, error normalize, correlation-id, `queryClient` + keys, `openStream`, `rbac.can`
      — specified and testable.
- [ ] Component inventory (§2) agreed; each has states + Storybook stories planned + a11y notes.
- [ ] Entity inventory (§4): DTO mirrors + ViewModels + query/mutation hook signatures + Zod schemas defined.
- [ ] Feature inventory (§3): boundaries + public APIs + RBAC gates defined; no cross-feature imports.
- [ ] Routing map (§5): route groups, layouts, `@inspector` slot, middleware, metadata, per-route states.
- [ ] Hook inventory (§6) enumerated with signatures + ownership rules.
- [ ] API layer (§8): every endpoint mapped (request/response/mapper/key/stream/cache/retry/invalidate).
- [ ] Build spec (§9): tsconfig/eslint/prettier/tailwind/postcss/storybook/vitest/playwright/msw config
      principles agreed; pinned versions locked in FS1 against the gate.
- [ ] Engineering gates (Stage 2 §14) wired into CI (lint/typecheck/test/a11y/bundle/perf/boundaries/visual/
      contract).
- [ ] Security (Stage 2 §8): cookie-session, middleware guards, CSP, write-only secrets — specified.
- [ ] Performance budgets + a11y checklist (D4 §3) adopted as gates.
- [ ] Traceability: D1–D4 + FRONTEND_MASTER_SPEC references resolved for every planned artifact.

**When every box is checked, implementation (FS1…FS15) proceeds with no remaining architecture decisions.**

---

## Architecture check (plan)

- **Conforms to `FRONTEND_MASTER_SPEC`** (§F4 product, §F5 constraints, §F6 gates, §F7 security) and **Stage 2**
  (FSD, RSC-first, six-state model, streaming, data layer). Realizes **D1–D4** at file level (Universal
  Inspector via `@inspector` parallel route; Workspace Consistency via widgets; ONYX via `shared/ui` + tokens;
  Status vocabulary via `shared/types`).
- **Backend impact: none** — client-only against `/api/v1`; *(assumed)* endpoints finalized against the
  contract; SSE/WS are frontend/optional-future; Architecture Freeze + Production Code Freeze intact.
- **New risks:** *(assumed)* endpoints must be confirmed against `API_SPEC.md` in FS1; open ADRs (chart lib,
  styling depth, observability vendor) decided before FS3 — both gated by plan-first discipline.

---

**STOP — Stage 3 complete. The engineering layer (Stage 2 + Stage 3) is fully specified.** Awaiting your
approval to begin **Frontend Implementation FS1 (Infrastructure)** — which I will start, per method, with a
plan only. No code is written yet. Backend + ONYX freezes intact.
