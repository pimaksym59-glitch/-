/**
 * The D2 §12 calm dot system: green healthy · amber degraded · red down ·
 * **grey unknown/gated**. Semantic tokens only — no token value is added or
 * changed, and no new D2 §11 status is registered: a probe state is a data-viz
 * health indicator, not an entry in the cross-screen status vocabulary
 * (plan §5.2, invariant I5).
 *
 * Colour is never the only signal — every dot is accompanied by its label in
 * the calling row, and the dot itself carries an accessible name.
 */
import type { ProbeState } from '@/entities/probe';

export const PROBE_TONE_LABEL: Record<ProbeState, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  down: 'Down',
  unknown: 'Unknown',
};

const TONE_CLASS: Record<ProbeState, string> = {
  healthy: 'bg-success',
  degraded: 'bg-warning',
  down: 'bg-danger',
  unknown: 'bg-border-strong',
};

export function ProbeDot({ state }: { readonly state: ProbeState }): React.ReactElement {
  return (
    <span
      role="img"
      aria-label={PROBE_TONE_LABEL[state]}
      className={`inline-block size-2.5 shrink-0 rounded-full ${TONE_CLASS[state]}`}
    />
  );
}
