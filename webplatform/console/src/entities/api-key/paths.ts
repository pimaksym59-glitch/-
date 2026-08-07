/**
 * The frozen API-key calls, verbatim (API_SPEC "Users & Security (owner)"):
 *
 *   GET /api-keys    the slot inventory — values are NEVER returned (§R12.2)
 *   PUT /api-keys    write-only rotation (§R10.4)
 *
 * There is deliberately no `reveal`, no `test`, no `delete` and no
 * per-provider path: the contract carries none, and a path that cannot be
 * called is never written down. In particular there is **no `/providers`
 * endpoint anywhere in the contract** (plan §5.2 D2) — provider capabilities
 * and connection tests are honest seams, not paths.
 */
export const apiKeyPaths = {
  list: () => '/api-keys',
  write: () => '/api-keys',
} as const;
