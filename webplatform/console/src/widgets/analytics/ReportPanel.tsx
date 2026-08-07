'use client';

/**
 * Period report panel (FS11 T-FS11.5) — `GET /analytics/reports/{daily|weekly|
 * monthly}`.
 *
 * Only the three documented period values are reachable, and the endpoint takes
 * **no range**: the provenance line says "range not sent" rather than implying
 * the filter bar applied to it. That distinction is the difference between a
 * report and a window, and pretending otherwise would be the easiest lie on
 * this screen.
 *
 * LAZY, chart-free — a period report is a set of totals.
 */
import type { PanelVM, ReportPeriod } from '@/entities/analytics-report';
import { REPORT_PERIODS } from '@/entities/analytics-report';
import { MetricList } from './MetricList';
import { PanelFrame } from './PanelFrame';

export function ReportPanel({
  panel,
  state,
  period,
  onPeriod,
  onRetry,
  onInspect,
}: {
  readonly panel: PanelVM | undefined;
  readonly state: 'loading' | 'error' | 'empty' | 'ready';
  readonly period: ReportPeriod;
  readonly onPeriod: (next: ReportPeriod) => void;
  readonly onRetry: () => void;
  readonly onInspect: (key: string) => void;
}): React.ReactElement {
  return (
    <PanelFrame
      id="report"
      title="Period report"
      description="A backend-computed roll-up. This endpoint takes no date range of its own."
      state={state}
      onRetry={onRetry}
      {...(panel ? { provenance: panel.provenance } : {})}
      actions={
        <div role="group" aria-label="Report period" className="flex flex-wrap gap-1">
          {REPORT_PERIODS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={period === value}
              onClick={() => onPeriod(value)}
              className={`rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors ${
                period === value
                  ? 'bg-interactive-subtle text-primary'
                  : 'text-secondary hover:bg-interactive-subtle hover:text-primary'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      }
    >
      {panel ? <MetricList metrics={panel.metrics} panelId="report" onInspect={onInspect} /> : null}
    </PanelFrame>
  );
}
