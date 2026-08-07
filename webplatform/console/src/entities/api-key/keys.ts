/** Entity-local keys (plan §3.2). API keys are platform-wide (owner-only per
 *  the API_SPEC matrix): no builder accepts a channel id. The cache holds slot
 *  IDENTITY and PRESENCE only — a secret never enters a query key, a query
 *  cache or anything else that persists (plan §5.2 D13). */
export const apiKeyKeys = {
  list: () => ['api-keys', 'list'] as const,
} as const;
