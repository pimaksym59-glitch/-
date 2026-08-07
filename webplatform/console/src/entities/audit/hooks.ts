'use client';

/**
 * Entity `audit` — READ hooks only. The audit log is immutable (§R10.8), so
 * this slice contains **no mutation, no invalidation and no cache write at
 * all** — asserted by `tests/unit/platform-ownership.test.ts`.
 */
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import type { AuditRecordWireDTO } from '@/shared/types';
import { auditKeys } from './keys';
import { mapAuditRecord, sortAuditRecords, type AuditRecordVM } from './model';
import { auditPaths } from './paths';

export const AUDIT_STALE_MS = 30_000;

export async function fetchAuditRecords(
  entity: string | null,
  actor: string | null,
  signal?: AbortSignal,
): Promise<readonly AuditRecordVM[]> {
  const wire = await apiFetch<readonly AuditRecordWireDTO[]>(
    auditPaths.list(entity, actor),
    signal ? { signal } : {},
  );
  return sortAuditRecords(wire.map(mapAuditRecord));
}

export function useAuditRecords(
  entity: string | null,
  actor: string | null,
  initialData?: readonly AuditRecordVM[],
) {
  return useQuery<readonly AuditRecordVM[]>({
    queryKey: auditKeys.list(entity, actor),
    queryFn: ({ signal }) => fetchAuditRecords(entity, actor, signal),
    ...(initialData !== undefined ? { initialData } : {}),
    staleTime: AUDIT_STALE_MS,
  });
}
