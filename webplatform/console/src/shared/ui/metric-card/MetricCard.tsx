import { clsx } from 'clsx';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Skeleton } from '../skeleton';
import { META_TEXT_TONE_CLASS } from '../tone';

/**
 * MetricCard (D2 §13.20 / §12). Sizes sm (inline KPI) / md (tile) / lg (hero).
 * Delta semantics are good/bad (not sign): `deltaIsGood` decides the colour.
 * The source whisper is decorative meta — the one legal small `tertiary` use
 * is avoided anyway; whisper renders ≥ meta rules via tone map.
 */
export type MetricCardSize = 'sm' | 'md' | 'lg';

export interface MetricCardProps {
  readonly label: string;
  readonly value: string;
  readonly delta?: string;
  readonly deltaIsGood?: boolean;
  readonly sparkline?: React.ReactNode;
  /** Source whisper (e.g. "Cost API · 5m ago"). Decorative meta text. */
  readonly source?: string;
  readonly size?: MetricCardSize;
  readonly loading?: boolean;
  readonly onDrill?: () => void;
  readonly className?: string;
}

const VALUE_SIZE: Record<MetricCardSize, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
};

export function MetricCard({
  label,
  value,
  delta,
  deltaIsGood = true,
  sparkline,
  source,
  size = 'md',
  loading = false,
  onDrill,
  className,
}: MetricCardProps): React.ReactElement {
  const Wrapper = onDrill ? 'button' : 'div';
  return (
    <Wrapper
      {...(onDrill ? { type: 'button' as const, onClick: onDrill } : {})}
      className={clsx(
        'onyx-raised block w-full rounded-xl p-5 text-left',
        onDrill &&
          'transition-[border-color,transform] duration-[120ms] hover:-translate-y-px hover:border-border-strong motion-reduce:hover:translate-y-0',
        className,
      )}
    >
      <div className="text-[13px] font-medium text-secondary">{label}</div>
      {loading ? (
        <div className="mt-2">
          <Skeleton width="60%" height={size === 'lg' ? 36 : 24} />
        </div>
      ) : (
        <div className="mt-1 flex items-baseline gap-2">
          <span
            className={clsx('font-semibold tabular-nums text-primary', VALUE_SIZE[size])}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {value}
          </span>
          {delta ? (
            <span
              className={clsx(
                'inline-flex items-center gap-0.5 text-[13px] font-medium',
                deltaIsGood ? 'text-success' : 'text-danger',
              )}
            >
              {deltaIsGood ? (
                <ArrowUpRight aria-hidden className="size-3.5" />
              ) : (
                <ArrowDownRight aria-hidden className="size-3.5" />
              )}
              {delta}
            </span>
          ) : null}
        </div>
      )}
      {sparkline ? <div className="mt-3">{sparkline}</div> : null}
      {source ? (
        // The whisper is 12px REAL text — rendered axe (FS5) proved `tertiary`
        // fails contrast here, so the small-text rule applies: `secondary`.
        <div className={clsx('mt-3 text-xs', META_TEXT_TONE_CLASS.secondary)}>{source}</div>
      ) : null}
    </Wrapper>
  );
}
