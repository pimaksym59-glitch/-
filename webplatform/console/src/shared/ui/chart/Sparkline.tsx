'use client';

import { curveMonotoneX } from '@visx/curve';
import { scaleLinear } from '@visx/scale';
import { LinePath } from '@visx/shape';
import { CHART } from './ChartFrame';

/**
 * Sparkline (D2 §13.19/§13.20). A tiny inline trend line — no axes, no
 * tooltip; the surrounding MetricCard carries the accessible value.
 */
export interface SparklineProps {
  readonly values: readonly number[];
  readonly width?: number;
  readonly height?: number;
  readonly color?: number;
  readonly className?: string;
}

export function Sparkline({
  values,
  width = 96,
  height = 28,
  color = 0,
  className,
}: SparklineProps): React.ReactElement {
  const xScale = scaleLinear<number>({
    domain: [0, Math.max(1, values.length - 1)],
    range: [0, width],
  });
  const yScale = scaleLinear<number>({
    domain: [Math.min(...values, 0), Math.max(...values, 1)],
    range: [height - 2, 2],
  });
  return (
    <svg width={width} height={height} aria-hidden className={className}>
      <LinePath
        data={values.map((v, i) => ({ i, v }))}
        x={(d) => xScale(d.i)}
        y={(d) => yScale(d.v)}
        curve={curveMonotoneX}
        stroke={CHART.series(color)}
        strokeWidth={1.5}
      />
    </svg>
  );
}
