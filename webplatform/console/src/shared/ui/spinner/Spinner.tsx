import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

/**
 * Spinner (D2 §11 Loading) — a bounded, non-AI loading indicator. NEVER use on
 * AI surfaces (those use Thinking/Streaming states, D2 §16 / §F3.3).
 */
export interface SpinnerProps {
  readonly size?: number;
  readonly label?: string;
  readonly className?: string;
}

export function Spinner({
  size = 16,
  label = 'Loading',
  className,
}: SpinnerProps): React.ReactElement {
  return (
    <span role="status" aria-live="polite" className={clsx('inline-flex text-tertiary', className)}>
      <Loader2 aria-hidden className="animate-spin" style={{ width: size, height: size }} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
