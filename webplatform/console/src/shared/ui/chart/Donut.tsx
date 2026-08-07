'use client';

import { Group } from '@visx/group';
import { Pie } from '@visx/shape';
import { useState } from 'react';
import { CHART, ChartFrame, type ChartState, ChartTooltip, type ChartTip } from './ChartFrame';
import type { ChartPoint } from './LineChart';

/**
 * Donut (D2 §13.19 — "sparingly"). Share-of-total only; a legend with values
 * accompanies the ring (the ring alone is never the only signal).
 */
export interface DonutProps extends ChartState {
  readonly label: string;
  readonly points: readonly ChartPoint[];
  readonly size?: number;
  readonly formatValue?: (value: number) => string;
  readonly className?: string;
}

export function Donut({
  label,
  points,
  size = 180,
  formatValue = (v) => String(v),
  className,
  ...frame
}: DonutProps): React.ReactElement {
  const [tip, setTip] = useState<ChartTip | null>(null);
  const isEmpty = points.length === 0 || points.every((p) => p.value === 0);
  const radius = size / 2;

  return (
    <div className={className}>
      <div className="relative inline-block">
        <ChartFrame
          label={label}
          height={size}
          {...frame}
          {...(isEmpty && frame.state === undefined ? { state: 'empty' as const } : {})}
        >
          {() => (
            <svg width={size} height={size}>
              <Group left={radius} top={radius}>
                <Pie
                  data={[...points]}
                  pieValue={(d) => d.value}
                  outerRadius={radius - 2}
                  innerRadius={radius * 0.62}
                  padAngle={0.02}
                >
                  {(pie) =>
                    pie.arcs.map((arc, i) => {
                      const [cx, cy] = pie.path.centroid(arc);
                      const show = (): void =>
                        setTip({
                          x: cx + radius,
                          y: cy + radius,
                          title: arc.data.label,
                          value: formatValue(arc.data.value),
                        });
                      return (
                        <path
                          key={arc.data.label}
                          d={pie.path(arc) ?? ''}
                          fill={CHART.series(i)}
                          tabIndex={0}
                          role="img"
                          aria-label={`${arc.data.label}: ${formatValue(arc.data.value)}`}
                          onMouseEnter={show}
                          onFocus={show}
                          onMouseLeave={() => setTip(null)}
                          onBlur={() => setTip(null)}
                        />
                      );
                    })
                  }
                </Pie>
              </Group>
            </svg>
          )}
        </ChartFrame>
        <ChartTooltip tip={tip} />
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {points.map((p, i) => (
          <li key={p.label} className="flex items-center gap-2 text-[13px]">
            <span
              aria-hidden
              className="inline-block size-2.5 rounded-pill"
              style={{ backgroundColor: CHART.series(i) }}
            />
            <span className="text-secondary">{p.label}</span>
            <span className="ml-auto font-mono tabular-nums text-primary">
              {formatValue(p.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
