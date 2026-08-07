import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import {
  auditPaths,
  mapAuditRecord,
  sortAuditRecords,
  type AuditRecordWireDTO,
} from '@/entities/audit';
import { serverApiOrNull } from '@/shared/lib/api/server-fetch';
import { AuditView, type AuditInitial } from '@/widgets/audit';
import { platformApiOptions } from '../_platform/server';

export const metadata: Metadata = { title: 'Audit' };

/**
 * Audit (FS12 T-FS12.9 — D3 §19). RSC initial-data page over the frozen
 * `GET /audit-log?entity=&actor=`, seeded with the same facets the URL carries.
 * Those two are the only parameters the contract documents, so no date range is
 * sent (plan §5.2 D8).
 */
export default async function AuditPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  const [params, store] = await Promise.all([searchParams, cookies()]);
  const options = await platformApiOptions(store);

  const one = (value: string | string[] | undefined): string | null =>
    typeof value === 'string' && value !== '' ? value : null;

  const wire = await serverApiOrNull<readonly AuditRecordWireDTO[]>(
    auditPaths.list(one(params['entity']), one(params['actor'])),
    options,
  );

  const initial: AuditInitial = {
    records: wire ? sortAuditRecords(wire.map(mapAuditRecord)) : null,
  };

  return <AuditView initial={initial} />;
}
