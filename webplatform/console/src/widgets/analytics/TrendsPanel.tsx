'use client';

/**
 * Trends panel (FS11 T-FS11.5) — `GET /analytics/trends` (§R11.7 trend
 * detection).
 *
 * "Trend" here means **what the backend served over time**, nothing more: no
 * regression line, no projection, no anomaly marker. A gated series is listed
 * as gated and **plots nothing** (§R10.3/§R7.3) — an empty line on a chart
 * would read as "activity dropped to zero", which is the exact lie this whole
 * screen exists to avoid.
 *
 * LAZY; the chart arrives through the frozen lazy entrypoint (plan §3.6).
 */
import type { PanelVM } from '@/entities/analytics-report';
import { LineChart } from '@/shared/ui/chart/lazy';
import { PanelFrame } from './PanelFrame';

export function TrendsPanel({
  panel,
  state,
  onRetry,
}: {
  readonly panel: PanelVM | undefined;
  readonly state: 'loading' | 'error' | 'empty' | 'ready';
  readonly onRetry: () => void;
}): React.ReactElement {
  const plotted = (panel?.series ?? []).filter((entry) => !entry.gated && entry.points.length > 0);
  const gated = (panel?.series ?? []).filter((entry) => entry.gated);

  return (
    <PanelFrame
      id="trends"
      title="Trends"
      description="Served values over the selected range. Nothing here is extrapolated or flagged."
      state={state}
      onRetry={onRetry}
      {...(panel ? { provenance: panel.provenance } : {})}
    >
      <div className="flex flex-col gap-3">
        <LineChart
          label="Trends"
          series={plotted.map((entry) => ({
            name: entry.label + (entry.unit ? ` (${entry.unit})` : ''),
            points: entry.points.map((point) => ({ label: point.key, value: point.value })),
          }))}
        />
        {plotted.length > 0 ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {plotted.map((entry) => (
              <li key={entry.key} className="text-[12px] text-secondary">
                {entry.label}
                {entry.rawKey ? ' (raw key)' : ''}
              </li>
            ))}
          </ul>
        ) : null}
        {gated.length > 0 ? (
          <p className="text-[13px] text-secondary" data-testid="trends-gated-note">
            Not plotted — gated without a stats adapter:{' '}
            {gated.map((entry) => entry.label).join(', ')}.
          </p>
        ) : null}
      </div>
    </PanelFrame>
  );
}
