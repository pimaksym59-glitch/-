'use client';

import { clsx } from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { ErrorState } from '../error-state/ErrorState';
import { Skeleton } from '../skeleton';

/**
 * ChartFrame (D2 §13.19/§12 — shared chrome for every chart). Owns responsive
 * measurement, the empty state, and the loading skeleton (axis + shimmer, per
 * §16 — charts never show a spinner). Charts are HEAVY (visx) — consume
 * lazily.
 */
export interface ChartState {
  readonly state?: 'idle' | 'loading' | 'error' | 'empty';
  readonly emptyText?: string;
  readonly errorTitle?: string;
  readonly onRetry?: () => void;
}

export interface ChartFrameProps extends ChartState {
  readonly label: string;
  readonly height?: number;
  readonly children: (size: { width: number; height: number }) => React.ReactNode;
  readonly className?: string;
}

export function useMeasuredWidth(): {
  readonly ref: React.RefObject<HTMLDivElement | null>;
  readonly width: number;
} {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w !== undefined) setWidth(Math.floor(w));
    });
    ro.observe(el);
    setWidth(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

export function ChartFrame({
  label,
  height = 240,
  state = 'idle',
  emptyText = 'No data for this range.',
  errorTitle = 'Couldn’t load this chart',
  onRetry,
  children,
  className,
}: ChartFrameProps): React.ReactElement {
  const { ref, width } = useMeasuredWidth();

  return (
    <div ref={ref} className={clsx('w-full', className)}>
      {state === 'loading' ? (
        <div aria-busy="true" className="flex gap-2" style={{ height }}>
          <div className="flex w-8 flex-col justify-between py-1">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} width={24} height={8} />
            ))}
          </div>
          <div className="flex-1">
            <Skeleton width="100%" height={height - 8} />
          </div>
        </div>
      ) : state === 'error' ? (
        <ErrorState scope="section" title={errorTitle} {...(onRetry ? { onRetry } : {})} />
      ) : state === 'empty' ? (
        <div
          className="flex items-center justify-center rounded-lg border border-dashed border-border-default text-sm text-secondary"
          style={{ height }}
        >
          {emptyText}
        </div>
      ) : width > 0 ? (
        <figure aria-label={label} role="img" className="m-0">
          {children({ width, height })}
        </figure>
      ) : (
        <div style={{ height }} />
      )}
    </div>
  );
}

/** Shared axis/grid token colors (D2 §12 — tokens only). */
export const CHART = {
  axis: 'var(--border-strong)',
  grid: 'var(--border-subtle)',
  tick: 'var(--text-secondary)',
  series: (i: number): string => `var(--viz-${(i % 8) + 1})`,
  tickFont: { fontFamily: 'var(--font-mono, monospace)', fontSize: 10 } as const,
} as const;

/** Minimal inline tooltip used by every chart (hover + keyboard focus). */
export interface ChartTip {
  readonly x: number;
  readonly y: number;
  readonly title: string;
  readonly value: string;
}

export function ChartTooltip({
  tip,
}: {
  readonly tip: ChartTip | null;
}): React.ReactElement | null {
  if (!tip) return null;
  return (
    <div
      role="status"
      className="onyx-floating pointer-events-none absolute z-[2] -translate-x-1/2 -translate-y-full rounded-md px-2 py-1 text-[11px]"
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      <span className="text-secondary">{tip.title}</span>{' '}
      <span className="font-mono font-medium text-primary">{tip.value}</span>
    </div>
  );
}
