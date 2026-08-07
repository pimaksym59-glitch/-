/**
 * Query keys for the `cost-report` entity — rooted at **`'cost-report'`**, NOT
 * `'cost'`.
 *
 * `shared/config/query-keys.ts` already carries FS5's `cost: () => ['cost',
 * 'by-day']`, and FS11's analytics keys live in `entities/analytics`. Billing is
 * a third reader of the same `/cost` resource, and invariant 13
 * (Analytics ≠ Dashboard ≠ Billing) is kept **structurally**: a distinct root
 * means no invalidation or refetch on one surface can reach another, in either
 * direction. Locked by `tests/unit/platform-commons.test.ts`.
 */
export const costReportKeys = {
  byGroup: (groupBy: string) => ['cost-report', groupBy] as const,
} as const;
