import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import {
  costReportPaths,
  mapCostReport,
  parseCostGroup,
  type CostEntryWireDTO,
} from '@/entities/cost-report';
import { serverApiOrNull } from '@/shared/lib/api/server-fetch';
import { BillingView, type BillingInitial } from '@/widgets/billing';
import { platformApiOptions } from '../_platform/server';

export const metadata: Metadata = { title: 'Billing' };

/**
 * Billing (FS12 T-FS12.12 — D3 §21, owner-ruled D9 Option A). One call:
 * `GET /cost?group_by=` (§R11.8). The facet lives in the URL, so the seed
 * matches what was asked for.
 *
 * Platform-wide by construction — the channel cookie is never read and no
 * channel id reaches the path, the key or the fetcher.
 */
export default async function BillingPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  const [params, store] = await Promise.all([searchParams, cookies()]);
  const options = await platformApiOptions(store);

  const raw = params['group_by'];
  const group = parseCostGroup(typeof raw === 'string' ? raw : null);

  const wire = await serverApiOrNull<readonly CostEntryWireDTO[]>(
    costReportPaths.byGroup(group),
    options,
  );

  const initial: BillingInitial = { report: wire ? mapCostReport(group, wire) : null };

  return <BillingView initial={initial} />;
}
