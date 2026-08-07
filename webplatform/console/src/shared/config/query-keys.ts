/**
 * Query-key root factory (Stage 2 §4 / Stage 3 §8). Keys always include channel
 * scope where relevant: [resource, ...params, channelId]. FS1 provided the
 * infrastructure keys; FS5 adds the dashboard entity keys — switching the
 * active channel re-scopes every channel-keyed query.
 */
export const queryKeys = {
  session: () => ['session'] as const,
  health: () => ['health'] as const,
  config: () => ['config'] as const,
  // FS5 — dashboard entities.
  channels: () => ['channels'] as const,
  needsReview: (channelId: string) => ['posts', 'needs_review', channelId] as const,
  post: (id: string) => ['posts', 'detail', id] as const,
  postHistory: (id: string) => ['posts', 'history', id] as const,
  jobs: (scope: string, channelId: string | null) => ['jobs', scope, channelId] as const,
  job: (id: string) => ['jobs', 'detail', id] as const,
  analytics: (channelId: string) => ['analytics', channelId] as const,
  cost: () => ['cost', 'by-day'] as const,
  // FS7 — knowledge documents (plan §3.2 invalidate graph).
  documents: (channelId: string) => ['documents', 'list', channelId] as const,
  document: (id: string) => ['documents', 'detail', id] as const,
  documentVersions: (id: string) => ['documents', 'versions', id] as const,
  // FS8 — memory (personas/actors + content memory). Distinct prefixes from
  // `documents` by design: Memory ≠ Knowledge (§R9.3, plan §2).
  personas: (channelId: string) => ['personas', 'list', channelId] as const,
  persona: (id: string) => ['personas', 'detail', id] as const,
  actors: (channelId: string) => ['actors', 'list', channelId] as const,
  actor: (id: string) => ['actors', 'detail', id] as const,
  publishedPosts: (channelId: string) => ['posts', 'published', channelId] as const,
  // FS9 — image/location keys are DELIBERATELY ABSENT here. This module sits in
  // every route's commons and `/chat` has 1.0 kB of First-Load headroom with the
  // FS8 offload lever spent, so studio-only key builders live in their entity
  // slices (`entities/image/keys.ts`, `entities/location/keys.ts`) — the FS7
  // entity-local `paths.ts` precedent applied to keys (FS9 plan §3.1/§3.2).
  // Locked by tests/unit/studio-commons.test.ts. Comments cost zero runtime bytes.
  // FS10 — prompt keys are DELIBERATELY ABSENT here for the same reason, and
  // they carry NO channel dimension at all: the `prompts` table has no
  // `channel_id`, so the Prompt Library is the project's first platform-wide
  // surface (plan §5.2 D1). Builders live in `entities/prompt/keys.ts`; locked
  // by tests/unit/prompts-commons.test.ts, which also fails if any prompt key
  // ever accepts a channelId (the owner's requirement A).
  // FS12 — every Platform & Admin key is DELIBERATELY ABSENT here as well:
  // `platformUserKeys`, `configVersionKeys`, `auditKeys`, `queueKeys`,
  // `apiKeyKeys`, `costReportKeys` and `probeKeys` all live in their entity
  // slices, so this module gains ZERO rows for the widest stage in the project.
  // Two facts worth keeping: (a) the `health` row ABOVE is FS1's, has zero
  // importers of its own, and `entities/probe` REUSES it for readiness rather
  // than duplicating a key that is already paid for; (b) the admin queue is
  // rooted at `'queue'`, NOT `'jobs'`, because `review-post`,
  // `insert-to-channel` and `add-source` already invalidate the BARE PREFIX
  // `['jobs']` — a prefix invalidation matches any key beginning with that
  // segment, so the FS11 positional trick would not have protected it.
  // Locked by tests/unit/platform-commons.test.ts.
  // FS11 — the range-scoped analytics keys are DELIBERATELY ABSENT here too;
  // they live in `entities/analytics/keys.ts`. The two rows ABOVE
  // (`analytics`, `cost`) are FS5's and are BYTE-IDENTICAL — the dashboard and
  // `features/review-post` depend on them. Every FS11 key puts a literal in
  // position 1 (`'range'`/`'quality'`/`'trends'`/`'report'`/`'group'`), so the
  // FS5 invalidation `['analytics', channelId]` can never match a range query
  // and vice versa. Locked by tests/unit/analytics-commons.test.ts.
} as const;

export type QueryKeyRoot = keyof typeof queryKeys;
