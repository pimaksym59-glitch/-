'use client';

import * as Progress from '@radix-ui/react-progress';
import { clsx } from 'clsx';

/**
 * ProgressBar (Stage 3 §2). Bounded determinate progress (uploads, batches).
 * Not for AI generation (Thinking/Streaming states own that, D2 §16).
 */
export interface ProgressBarProps {
  readonly label: string;
  readonly value: number;
  readonly max?: number;
  readonly showValue?: boolean;
  readonly className?: string;
}

export function ProgressBar({
  label,
  value,
  max = 100,
  showValue = false,
  className,
}: ProgressBarProps): React.ReactElement {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <Progress.Root
        aria-label={label}
        value={value}
        max={max}
        className="h-1.5 w-full overflow-hidden rounded-pill bg-inset"
      >
        <Progress.Indicator
          className="h-full rounded-pill bg-interactive transition-[width] duration-[180ms] ease-[var(--ease-standard)]"
          style={{ width: `${pct}%` }}
        />
      </Progress.Root>
      {showValue ? (
        <span className="shrink-0 text-[13px] tabular-nums text-secondary">{Math.round(pct)}%</span>
      ) : null}
    </div>
  );
}
