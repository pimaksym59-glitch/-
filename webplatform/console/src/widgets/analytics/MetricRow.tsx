'use client';

/**
 * The channel snapshot row (FS11 T-FS11.5 — D3 §12 "Metric Cards").
 *
 * The snapshot arrives in the SAME metric vocabulary as every other panel, so
 * the split here is mechanical and cannot drift: entries the wire marks
 * available render as ONYX MetricCards; entries it marks **gated** are handed
 * to the Gated card and **never** rendered as a card with a dash (§R10.3).
 *
 * Labels are neutral ("Cost", "Published") rather than the wire's `cost_today`
 * / `published_today`: this endpoint accepts `?from=&to=`, so calling a ranged
 * value "today" would be wrong (FE-RV-14 asks what the backend actually does).
 */
import type { PanelVM } from '@/entities/analytics-report';
import { formatCost, formatNumber } from '@/shared/lib/format';
import { ErrorState } from '@/shared/ui/error-state';
import { MetricCard } from '@/shared/ui/metric-card';
import { GatedPanel } from './GatedPanel';
import { ProvenanceWhisper } from './PanelFrame';

export function MetricRow({
  panel,
  isPending,
  isError,
  onRetry,
  onInspect,
}: {
  readonly panel: PanelVM | undefined;
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly onRetry: () => void;
  readonly onInspect: (key: string) => void;
}): React.ReactElement {
  if (isError) {
    return (
      <ErrorState scope="section" title="Couldn’t load this channel’s metrics" onRetry={onRetry} />
    );
  }

  const metrics = panel?.metrics ?? [];
  const open = metrics.filter((metric) => !metric.gated);
  const gated = metrics.filter((metric) => metric.gated).map((metric) => metric.label);

  return (
    <section aria-label="Channel metrics" className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isPending ? (
          <>
            <MetricCard label="Cost" value="—" loading source="Analytics API" />
            <MetricCard label="Published" value="—" loading source="Analytics API" />
          </>
        ) : (
          open.map((metric) => (
            <MetricCard
              key={metric.key}
              label={metric.label}
              value={
                metric.value === null
                  ? '—'
                  : metric.key === 'cost'
                    ? formatCost(metric.value)
                    : formatNumber(metric.value)
              }
              source="Analytics API"
              onDrill={() => onInspect(`snapshot.${metric.key}`)}
            />
          ))
        )}
        <GatedPanel title="Engagement" metrics={gated} />
      </div>
      {panel ? <ProvenanceWhisper provenance={panel.provenance} /> : null}
    </section>
  );
}
