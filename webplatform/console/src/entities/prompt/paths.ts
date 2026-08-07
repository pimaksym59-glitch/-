/**
 * The frozen §Prompts calls, verbatim (API_SPEC "Prompts (§R10.6 —
 * версионируемые)"). Entity-local (the FS7 `documentPaths` precedent — commons
 * stay untouched, plan §3.1/§3.6).
 *
 * The group is **three calls and nothing else**:
 *   GET  /prompts?type=          list (the ONE filter the wire accepts)
 *   POST /prompts                a NEW VERSION (§R10.6 "Правка = новая версия")
 *   GET  /prompts/{id}/versions  the version chain of a row
 *
 * There is deliberately **no** `detail`, `update`, `remove` or `promote` here:
 * the contract carries no `GET /prompts/{id}`, no PATCH, no DELETE and no
 * activation call, so the Prompt Library renders none of those affordances
 * (plan §5.2 D2/D3/D4). A path that cannot be called is never written down.
 *
 * Note what is absent from every signature: a **channelId**. The `prompts`
 * table has no `channel_id` (DATABASE_SPEC §prompts) — the library is
 * platform-wide (plan §5.2 D1), and `tests/unit/prompts-commons.test.ts`
 * fails if a channel ever appears here.
 */
export const promptPaths = {
  /** GET — optionally narrowed by the contract's own `?type=` filter. */
  list: (type?: string | null) =>
    type === undefined || type === null || type === ''
      ? '/prompts'
      : `/prompts?type=${encodeURIComponent(type)}`,
  /** POST — creates a new VERSION of a prompt type (§R10.6). */
  create: () => '/prompts',
  /** GET — the version chain for a row (§R10.6). */
  versions: (id: string) => `/prompts/${encodeURIComponent(id)}/versions`,
} as const;
