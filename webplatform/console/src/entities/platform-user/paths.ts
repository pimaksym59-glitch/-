/**
 * The frozen §Users & Security calls, verbatim (API_SPEC "Users & Security
 * (owner)"). Entity-local (the FS7 `documentPaths` precedent).
 *
 * The group the Admin screen may call is exactly three paths:
 *   GET   /users                 the roster
 *   POST  /users                 CREATE a user (NOT an invitation — plan D7)
 *   PATCH /users/{id}            the ROLE change
 *
 * Deliberately absent: `GET /users/{id}` (no such call), DELETE (none), and any
 * deactivate path — the `users` table has a `status` column but the contract
 * documents no write for it (FE-RV-15). A path that cannot be called is never
 * written down.
 */
export const platformUserPaths = {
  list: () => '/users',
  create: () => '/users',
  role: (id: string) => `/users/${encodeURIComponent(id)}`,
  /** POST /auth/sessions/revoke — the only session call that exists (D6). */
  revokeSessions: () => '/auth/sessions/revoke',
} as const;
