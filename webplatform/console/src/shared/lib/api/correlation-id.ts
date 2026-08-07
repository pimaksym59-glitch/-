/**
 * Correlation id (Stage 2 §11). A per-request id sent as `X-Request-Id` so
 * client traces align with the backend's structured logs (§R12.9). Read-side
 * only — no backend change.
 */
export const CORRELATION_HEADER = 'X-Request-Id';

export function generateCorrelationId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID.
  return `cid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
