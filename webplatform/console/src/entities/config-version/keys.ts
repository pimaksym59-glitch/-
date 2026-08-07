/** Entity-local keys (plan §3.2) — commons gains zero rows. Config versions are
 *  platform-wide (§R10.8): no builder accepts a channel id. */
export const configVersionKeys = {
  list: () => ['config-versions', 'list'] as const,
  detail: (id: string) => ['config-versions', 'detail', id] as const,
} as const;
