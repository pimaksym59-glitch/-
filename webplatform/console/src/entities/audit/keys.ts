/** Entity-local keys (plan §3.2). The audit log is platform-wide (§R10.8) and
 *  the contract's facets are `entity` and `actor` — nothing else is keyed,
 *  because nothing else is sent. Locked by `platform-commons.test.ts`. */
export const auditKeys = {
  list: (entity: string | null, actor: string | null) =>
    ['audit', 'list', entity ?? 'all', actor ?? 'all'] as const,
} as const;
