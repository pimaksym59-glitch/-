'use client';

/**
 * The shared metric list used by the Quality and Report panels (FS11 T-FS11.5).
 *
 * Three honesty rules live here:
 *
 * 1. **A gated entry shows no value** — ever, even when the wire carried one
 *    (§R10.3). It says "unavailable" and is not inspectable, because there is
 *    nothing to inspect.
 * 2. **An unrecognised key keeps its raw wire name** and is marked as such (the
 *    FS8 `style_features` precedent), so a backend that adds a field degrades
 *    into an honestly-labelled row instead of silent data loss.
 * 3. **Nothing is computed** — no deltas, no percentages, no "up/down" chips.
 *    The contract serves values for one range; a delta would need a second
 *    range this panel never requested.
 */
import type { MetricEntryVM } from '@/entities/analytics-report';

export function MetricList({
  metrics,
  panelId,
  onInspect,
}: {
  readonly metrics: readonly MetricEntryVM[];
  readonly panelId: string;
  readonly onInspect: (key: string) => void;
}): React.ReactElement {
  return (
    <ul className="flex flex-col divide-y divide-border-subtle">
      {metrics.map((metric) => (
        <li key={metric.key} className="py-2">
          {metric.gated ? (
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm text-primary">
                {metric.label}
                {metric.rawKey ? (
                  <span className="ml-2 text-[12px] text-secondary">(raw key)</span>
                ) : null}
              </span>
              <span className="text-[13px] text-secondary">unavailable — gated</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onInspect(`${panelId}.${metric.key}`)}
              className="flex w-full items-baseline justify-between gap-4 rounded-md text-left transition-colors hover:bg-interactive-subtle"
            >
              <span className="text-sm text-primary">
                {metric.label}
                {metric.rawKey ? (
                  <span className="ml-2 text-[12px] text-secondary">(raw key)</span>
                ) : null}
              </span>
              <span className="font-mono text-sm tabular-nums text-primary">
                {metric.value === null ? '—' : String(metric.value)}
                {metric.unit ? (
                  <span className="ml-1 text-[13px] text-secondary">{metric.unit}</span>
                ) : null}
              </span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
