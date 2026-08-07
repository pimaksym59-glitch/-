/**
 * Endpoint catalogue (Stage 3 §8). Central, typed path builders against the
 * frozen `/api/v1` contract (API_SPEC.md). FS1 declares only the infrastructure
 * endpoints (auth/session, health, stream relay); per-group endpoints are added
 * with their entity slices (FS4+). No backend change is implied.
 */
export const endpoints = {
  auth: {
    me: () => '/auth/me',
    login: () => '/auth/login',
    logout: () => '/auth/logout',
    revokeSessions: () => '/auth/sessions/revoke',
  },
  health: () => '/health',
  /** AI SSE relay handled by the Next route handler (app/api/ai/stream), not /api/v1 (FS6). */
  aiStream: () => '/api/ai/stream',
  // FS7 note: the /documents path builders live in `entities/document`
  // (`documentPaths`) — this shared module sits in every route's commons and
  // the knowledge-only bytes must not tax /chat's First Load (plan §6.3.6;
  // the FS5 precedent is entity-local paths).
  // FS8/FS9/FS10/FS11 followed the same rule: `personaPaths`, `actorPaths`,
  // `imagePaths`, `locationPaths`, `promptPaths` and `analyticsPaths` are all
  // entity-local. This module deliberately gains ZERO rows per stage; comments
  // cost zero runtime bytes (locked by tests/unit/{prompts,analytics}-commons).
  // FS12 followed it for all seven platform slices: `platformUserPaths`,
  // `configVersionPaths`, `auditPaths`, `queuePaths`, `probePaths`,
  // `apiKeyPaths` and `costReportPaths` are entity-local too.
  // NOTE on the `health` row above: it predates the contract reading and points
  // at `/health`, while API_SPEC carries `/health/live` and `/health/ready`
  // (§R12.10 — liveness ≠ readiness). It has ZERO importers (verified at
  // T-FS12.1) and is left BYTE-IDENTICAL rather than "fixed": editing a commons
  // module for no user-visible gain would spend `/chat` headroom to no purpose.
  // `entities/probe/paths.ts` carries the two real paths.
} as const;
