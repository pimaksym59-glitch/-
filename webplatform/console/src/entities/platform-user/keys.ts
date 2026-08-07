/**
 * Query keys for the `platform-user` entity — **entity-local by design**
 * (FS9/FS10/FS11 mechanism, now the default). `/chat` sits at 179 / 180 kB and
 * the FS8 commons-offload lever is spent, so `shared/config/query-keys.ts`
 * gains ZERO rows in FS12 (plan §3.2).
 *
 * **Channel-free by construction.** The `users` table has no `channel_id`
 * (DATABASE_SPEC §users) — governance is platform-wide, exactly as the Prompt
 * Library is. No builder here accepts a channel id, which is what makes
 * "switching channels changes nothing on Admin" a structural fact rather than
 * a behaviour to remember. Locked by `tests/unit/platform-commons.test.ts`.
 */
export const platformUserKeys = {
  list: () => ['platform-users', 'list'] as const,
  detail: (id: string) => ['platform-users', 'detail', id] as const,
} as const;
