'use client';

/**
 * CostBreakdown (FS12) — the served cost rows on a real ONYX chart plus the
 * numbers beside it, because a chart alone is not an accessible answer.
 *
 * A day facet reads chronologically as a line; every other facet is a
 * magnitude comparison and reads as bars (D2 §12). Charts arrive through the
 * frozen `chart/lazy` entrypoint, so visx stays out of First Load (ADR-FE-1) —
 * FS11 measured the visx family's runtime cost when it became the second
 * consumer, and FS12 is the third.
 */
import type { CostReportVM } from '@/entities/cost-report';
import { formatCost } from '@/shared/lib/format';
import { BarChart, LineChart } from '@/shared/ui/chart/lazy';

export function CostBreakdown({ report }: { readonly report: CostReportVM }): React.ReactElement {
  const points = report.rows.map((row) => ({ label: row.key, value: row.amountUsd }));

  return (
    <section
      aria-labelledby="cost-breakdown-heading"
      className="onyx-raised flex flex-col gap-4 rounded-xl border border-border-subtle p-5"
    >
      <h2 id="cost-breakdown-heading" className="text-sm font-semibold text-primary">
        Cost by {report.group}
      </h2>

      {report.group === 'day' ? (
        <LineChart
          label={`Cost by day`}
          series={[{ name: 'Cost', points }]}
          area
          formatValue={formatCost}
        />
      ) : (
        <BarChart label={`Cost by ${report.group}`} points={points} formatValue={formatCost} />
      )}

      <ul aria-label={`Cost rows by ${report.group}`} className="flex flex-col gap-1">
        {report.rows.map((row) => (
          <li
            key={row.key}
            className="flex items-baseline justify-between gap-4 border-b border-border-subtle py-1 last:border-b-0"
          >
            <span className="truncate text-[13px] text-primary">{row.key}</span>
            <span className="shrink-0 text-[13px] tabular-nums text-secondary">
              {formatCost(row.amountUsd)}
              <span className="ml-2 text-[12px]">{(row.share * 100).toFixed(1)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
