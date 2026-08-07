/**
 * The frozen §Health calls, verbatim (API_SPEC "Health (§R12.10 — без auth)"):
 *
 *   GET /health/live    200 if the process is alive        (LIVENESS)
 *   GET /health/ready   200/503 by dependency availability (READINESS)
 *
 * Liveness and readiness are DIFFERENT endpoints by requirement (§R12.10) and
 * the screen keeps them apart. There is no probe-history call, no uptime call
 * and no alert-subscription call — those are honest seams, not paths.
 *
 * Entity-local. Note that `shared/lib/api/endpoints.ts` carries an FS1-era
 * `health: () => '/health'` row: it has ZERO importers (verified at T-FS12.1),
 * predates this contract reading, and is left BYTE-IDENTICAL rather than
 * "fixed" — editing a commons module for no user-visible gain would spend
 * `/chat` headroom to no purpose (rule №33 thinking applied to hygiene).
 */
export const probePaths = {
  live: () => '/health/live',
  ready: () => '/health/ready',
} as const;
