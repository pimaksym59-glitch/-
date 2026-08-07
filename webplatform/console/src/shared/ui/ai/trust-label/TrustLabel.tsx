import { clsx } from 'clsx';
import { Badge } from '../../badge/Badge';

/**
 * TrustLabel (D2 §14 / owner requirement 15). Every AI block carries Trust:
 * Generated / Verified / Needs-Review + Source-Available / Source-None. This
 * label is the compact, always-visible form; ExplainabilityPanel is the deep
 * form.
 */
export type TrustState = 'generated' | 'verified' | 'needs-review';

export interface TrustLabelProps {
  readonly trust: TrustState;
  readonly sourceAvailable: boolean;
  readonly className?: string;
}

const TRUST_META: Record<TrustState, { label: string; tone: 'ai' | 'success' | 'warning' }> = {
  generated: { label: 'Generated', tone: 'ai' },
  verified: { label: 'Verified', tone: 'success' },
  'needs-review': { label: 'Needs Review', tone: 'warning' },
};

export function TrustLabel({
  trust,
  sourceAvailable,
  className,
}: TrustLabelProps): React.ReactElement {
  const meta = TRUST_META[trust];
  return (
    <span className={clsx('inline-flex items-center gap-1.5', className)}>
      <Badge tone={meta.tone}>{meta.label}</Badge>
      <Badge tone={sourceAvailable ? 'neutral' : 'warning'}>
        {sourceAvailable ? 'Source available' : 'No source'}
      </Badge>
    </span>
  );
}
