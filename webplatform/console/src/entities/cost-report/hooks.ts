'use client';

/** Entity `cost-report` — READ hooks (FS12 Billing). The §Analytics & Cost
 *  group is read-only: no mutation exists and none is written. */
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import type { CostEntryWireDTO } from '@/shared/types';
import { costReportKeys } from './keys';
import { mapCostReport, type CostGroup, type CostReportVM } from './model';
import { costReportPaths } from './paths';

export const COST_REPORT_STALE_MS = 60_000;

export async function fetchCostReport(
  group: CostGroup,
  signal?: AbortSignal,
): Promise<CostReportVM> {
  const wire = await apiFetch<readonly CostEntryWireDTO[]>(
    costReportPaths.byGroup(group),
    signal ? { signal } : {},
  );
  return mapCostReport(group, wire);
}

export function useCostReport(group: CostGroup, initialData?: CostReportVM) {
  return useQuery<CostReportVM>({
    queryKey: costReportKeys.byGroup(group),
    queryFn: ({ signal }) => fetchCostReport(group, signal),
    ...(initialData !== undefined ? { initialData } : {}),
    staleTime: COST_REPORT_STALE_MS,
  });
}
