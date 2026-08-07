'use client';

/**
 * Cost panel (FS11 T-FS11.5) — the §R11.8 reliable source, and the strongest
 * real data on this screen.
 *
 * LAZY: this module is the one that pulls a chart, and every chart arrives
 * through the frozen `@/shared/ui/chart/lazy` entrypoint so the visx family
 * keeps a single entry point (plan §3.6, the FS10 Shiki lesson inverted).
 *
 * `group_by` is the contract's OWN facet (`/cost?group_by=`), so switching it
 * is a real server call and a real URL change — not a client-side re-slice.
 */
import type { CostGroupBy, PanelVM } from '@/entities/analytics-report';
import { COST_FACET_LABEL, COST_GROUP_BY } from '@/entities/analytics-report';
import { formatCost } from '@/shared/lib/format';
import { BarChart, LineChart } from '@/shared/ui/chart/lazy';
import { PanelFrame } from './PanelFrame';

export function CostPanel({
  panel,
  state,
  groupBy,
  onGroupBy,
  onRetry,
  actions,
}: {
  readonly panel: PanelVM | undefined;
  readonly state: 'loading' | 'error' | 'empty' | 'ready';
  readonly groupBy: CostGroupBy;
  readonly onGroupBy: (next: CostGroupBy) => void;
  readonly onRetry: () => void;
  readonly actions?: React.ReactNode;
}): React.ReactElement {
  const series = panel?.series[0];
  const points = (series?.points ?? []).map((point) => ({ label: point.key, value: point.value }));

  return (
    <PanelFrame
      id="cost"
      title={COST_FACET_LABEL[groupBy]}
      description="Spend recorded by the platform itself — always available, no adapter required."
      state={state}
      onRetry={onRetry}
      {...(panel ? { provenance: panel.provenance } : {})}
      actions={
        <div className="flex flex-col items-end gap-2">
          <div role="group" aria-label="Group cost by" className="flex flex-wrap gap-1">
            {COST_GROUP_BY.map((facet) => (
              <button
                key={facet}
                type="button"
                aria-pressed={groupBy === facet}
                onClick={() => onGroupBy(facet)}
                className={`rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors ${
                  groupBy === facet
                    ? 'bg-interactive-subtle text-primary'
                    : 'text-secondary hover:bg-interactive-subtle hover:text-primary'
                }`}
              >
                {facet}
              </button>
            ))}
          </div>
          {actions}
        </div>
      }
    >
      {groupBy === 'day' ? (
        <LineChart
          label={COST_FACET_LABEL[groupBy]}
          area
          series={[{ name: 'Cost (USD)', points }]}
          formatValue={(value) => formatCost(value)}
        />
      ) : (
        <BarChart
          label={COST_FACET_LABEL[groupBy]}
          points={points}
          formatValue={(value) => formatCost(value)}
        />
      )}
    </PanelFrame>
  );
}
