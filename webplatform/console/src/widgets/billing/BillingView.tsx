'use client';

/**
 * BillingView (FS12 T-FS12.12 — D3 §21, owner-ruled D9 Option A).
 *
 * The one reliable money signal the contract exposes is
 * `GET /cost?group_by=` (§R11.8), so that is the entire screen: a platform-wide
 * cost breakdown over the contract's own facet. Plan, invoices, budget alerts
 * and forecasting have no endpoint and are named seams — and **no AI forecast
 * exists here**, per the owner's FS11 ruling that the console does not invent
 * forecasts.
 *
 * **Analytics ≠ Billing is structural** (invariant 13). This screen reads the
 * same resource FS11's Cost panel reads, but through its own slice with its own
 * `['cost-report', …]` key root, so neither surface can invalidate or re-scope
 * the other in either direction. It is also **platform-wide**: no channel id
 * reaches the path, the key or the fetcher, and the channel switcher provably
 * changes nothing here (the FS10 requirement-A standard).
 */
import dynamic from 'next/dynamic';
import { useQueryState } from 'nuqs';
import {
  COST_GROUPS,
  COST_GROUP_LABELS,
  parseCostGroup,
  useCostReport,
  type CostReportVM,
} from '@/entities/cost-report';
import { formatCost } from '@/shared/lib/format';
import { ErrorState } from '@/shared/ui/error-state';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { Skeleton } from '@/shared/ui/skeleton';
import { BillingHonesty } from './BillingHonesty';

/** The chart is LAZY through the frozen entrypoint (ADR-FE-1). */
const CostBreakdown = dynamic(() => import('./CostBreakdown').then((m) => m.CostBreakdown), {
  loading: () => <Skeleton height={240} />,
});

export interface BillingInitial {
  readonly report: CostReportVM | null;
}

export function BillingView({ initial }: { readonly initial: BillingInitial }): React.ReactElement {
  const [rawGroup, setGroup] = useQueryState('group_by', { history: 'push' });
  const group = parseCostGroup(rawGroup);
  const query = useCostReport(
    group,
    initial.report && initial.report.group === group ? initial.report : undefined,
  );
  const report = query.data ?? null;

  return (
    <section className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 px-6 py-8 md:px-8">
      <header>
        <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.015em] text-primary">
          Billing
        </h1>
        <p className="mt-1 max-w-[72ch] text-sm text-secondary">
          What the platform spent, computed by the backend from recorded API and image usage
          (§R11.8). Costs are the reliable signal here — everything a billing provider would add is
          absent and said so below.
        </p>
      </header>

      <SegmentedControl
        label="Group cost by"
        items={COST_GROUPS.map((value) => ({ value, label: COST_GROUP_LABELS[value] }))}
        value={group}
        onValueChange={(value) => void setGroup(value === 'day' ? null : value)}
      />

      {query.isPending ? (
        <Skeleton height={240} />
      ) : query.isError ? (
        <ErrorState
          title="Couldn’t load cost"
          detail={`GET /cost?group_by=${group} did not answer.`}
          onRetry={() => void query.refetch()}
        />
      ) : report && report.rows.length > 0 ? (
        <>
          <div className="onyx-raised rounded-xl border border-border-subtle p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
              Total in the served window
            </p>
            <p className="mt-1 text-[28px] font-semibold tabular-nums text-primary">
              {formatCost(report.totalUsd)}
            </p>
            <p className="mt-1 text-[13px] text-secondary">
              Source: GET /cost?group_by={group} · {String(report.rows.length)} rows · summed
              client-side from the served values, with nothing projected.
            </p>
          </div>
          <CostBreakdown report={report} />
        </>
      ) : (
        <div className="onyx-raised rounded-xl border border-border-subtle p-5">
          <p className="text-sm font-medium text-primary">No cost recorded yet</p>
          <p className="mt-1 text-[13px] text-secondary">
            Usage will appear as the platform runs. Costs are computed from api_usage and
            image_usage — not from an invoice.
          </p>
        </div>
      )}

      <BillingHonesty />
    </section>
  );
}
