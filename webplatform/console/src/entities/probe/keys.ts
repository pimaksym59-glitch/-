/**
 * Query keys for the `probe` entity.
 *
 * **Readiness reuses the FS1 commons row `queryKeys.health()`** — it already
 * exists, it is `['health']`, and T-FS12.1 verified it has zero importers. Using
 * a key that is already paid for adds zero commons rows AND zero entity rows,
 * which is strictly better than duplicating it locally. The liveness key is
 * entity-local because it is new.
 *
 * Locked by `tests/unit/platform-commons.test.ts`: `queryKeys.health()` must
 * stay byte-identical to its FS1 form.
 */
export const probeKeys = {
  live: () => ['health', 'live'] as const,
} as const;
