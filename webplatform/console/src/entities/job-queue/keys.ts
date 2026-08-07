/**
 * Query keys for the `job-queue` entity — entity-local, and rooted at
 * **`'queue'`, deliberately NOT `'jobs'`** (plan §3.2, owner requirement 3).
 *
 * Three shipped features already invalidate the BARE PREFIX `['jobs']`
 * (`review-post`, `insert-to-channel`, `add-source/useDocumentIntents`). A
 * prefix invalidation matches ANY key beginning with that segment, so the FS11
 * "positionally unmatchable" technique would not protect a key rooted at
 * `'jobs'` — a dashboard approve/reject would silently sweep the admin queue.
 * A distinct root makes the two hierarchies **completely independent**, and the
 * coupling that IS wanted (a cancelled publish should refresh the dashboard
 * timeline) is declared explicitly in `features/requeue-job` instead of
 * happening by accident.
 *
 * Locked by `tests/unit/platform-commons.test.ts`, which fails if any builder
 * here emits a key whose first segment is `'jobs'`.
 */
export const queueKeys = {
  /** The filtered queue. The three segments are the contract's OWN filters. */
  list: (status: string | null, type: string | null, channelId: string | null) =>
    ['queue', 'list', status ?? 'all', type ?? 'all', channelId ?? 'all'] as const,
  detail: (id: string) => ['queue', 'detail', id] as const,
} as const;
