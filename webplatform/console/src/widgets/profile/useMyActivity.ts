'use client';

/**
 * The personal activity read — and the privacy lock that makes it safe.
 *
 * `GET /audit-log?entity=&actor=` is the only call in the frozen contract that
 * can answer "what have I done". `entities/audit` (FS12) already owns it, so
 * FS13 adds no key, no path and no fetcher, and does not open that slice.
 *
 * The guarantee this module exists to make mechanical:
 *
 *   **a null actor never reaches the audit query.**
 *
 * Without it, a missing user id would silently widen a personal feed into the
 * platform-wide audit log — a privacy leak dressed as a fallback. The
 * enforcement is a TYPE, not a habit: `userId` is a non-nullable `string`, so a
 * caller holding `string | null` cannot invoke this hook at all and must render
 * the honest absence instead (`ActivityPanel` does exactly that). React's rules
 * of hooks make the alternative — calling it conditionally — impossible too, so
 * the component boundary IS the lock. `tests/unit/activity-scope.test.ts`
 * asserts it at source level.
 */
import { useAuditRecords, type AuditRecordVM } from '@/entities/audit';

export interface MyActivityResult {
  readonly records: readonly AuditRecordVM[];
  readonly isPending: boolean;
  readonly isError: boolean;
}

export function useMyActivity(userId: string): MyActivityResult {
  const query = useAuditRecords(null, userId);
  return {
    records: query.data ?? [],
    isPending: query.isPending,
    isError: query.isError,
  };
}
