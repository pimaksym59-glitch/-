'use client';

/**
 * Quality panel (FS11 T-FS11.5) — `GET /analytics/quality` (§R11.7:
 * quality / similarity / regeneration).
 *
 * The contract documents no schema for this response, so the panel renders
 * exactly what arrives: known keys get their label, unknown keys keep their raw
 * wire name, and a gated entry shows no value. **No diversity metric is
 * synthesised here** — if the backend sends diversity keys they appear like any
 * other; if it does not, the panel simply does not claim one (plan §5.2 D7).
 *
 * LAZY, and deliberately chart-free: these are scalar measurements, and a chart
 * of one point per metric would be decoration, not information (D2 §12).
 */
import type { PanelVM } from '@/entities/analytics-report';
import { MetricList } from './MetricList';
import { PanelFrame } from './PanelFrame';

export function QualityPanel({
  panel,
  state,
  onRetry,
  onInspect,
}: {
  readonly panel: PanelVM | undefined;
  readonly state: 'loading' | 'error' | 'empty' | 'ready';
  readonly onRetry: () => void;
  readonly onInspect: (key: string) => void;
}): React.ReactElement {
  return (
    <PanelFrame
      id="quality"
      title="Quality"
      description="Validation and uniqueness measurements the platform computes for itself (§R11.7)."
      state={state}
      onRetry={onRetry}
      {...(panel ? { provenance: panel.provenance } : {})}
    >
      {panel ? (
        <MetricList metrics={panel.metrics} panelId="quality" onInspect={onInspect} />
      ) : null}
    </PanelFrame>
  );
}
