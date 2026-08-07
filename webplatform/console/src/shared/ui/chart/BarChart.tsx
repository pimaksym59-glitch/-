'use client';

import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { scaleBand, scaleLinear } from '@visx/scale';
import { Bar } from '@visx/shape';
import { useState } from 'react';
import { CHART, ChartFrame, type ChartState, ChartTooltip, type ChartTip } from './ChartFrame';
import type { ChartPoint } from './LineChart';

/**
 * BarChart (D2 §13.19, visx — HEAVY, consume lazily). Rounded-top bars on the
 * viz ramp; tooltip on hover/focus; keyboard-focusable bars.
 */
export interface BarChartProps extends ChartState {
  readonly label: string;
  readonly points: readonly ChartPoint[];
  readonly height?: number;
  readonly color?: number;
  readonly formatValue?: (value: number) => string;
  readonly className?: string;
}

const MARGIN = { top: 8, right: 8, bottom: 24, left: 40 };

export function BarChart({
  label,
  points,
  height = 240,
  color = 0,
  formatValue = (v) => String(v),
  className,
  ...frame
}: BarChartProps): React.ReactElement {
  const [tip, setTip] = useState<ChartTip | null>(null);
  const isEmpty = points.length === 0;

  return (
    <div className="relative">
      <ChartFrame
        label={label}
        height={height}
        {...frame}
        {...(isEmpty && frame.state === undefined ? { state: 'empty' as const } : {})}
        {...(className !== undefined ? { className } : {})}
      >
        {({ width }) => {
          const xMax = width - MARGIN.left - MARGIN.right;
          const yMax = height - MARGIN.top - MARGIN.bottom;
          const xScale = scaleBand<string>({
            domain: points.map((p) => p.label),
            range: [0, xMax],
            padding: 0.35,
          });
          const yScale = scaleLinear<number>({
            domain: [0, Math.max(1, ...points.map((p) => p.value)) * 1.1],
            range: [yMax, 0],
            nice: true,
          });
          const fill = CHART.series(color);
          return (
            <svg width={width} height={height}>
              <Group left={MARGIN.left} top={MARGIN.top}>
                <GridRows scale={yScale} width={xMax} stroke={CHART.grid} numTicks={4} />
                {points.map((p) => {
                  const barX = xScale(p.label) ?? 0;
                  const barY = yScale(p.value);
                  const show = (): void =>
                    setTip({
                      x: barX + (xScale.bandwidth() ?? 0) / 2 + MARGIN.left,
                      y: barY + MARGIN.top,
                      title: p.label,
                      value: formatValue(p.value),
                    });
                  return (
                    <Bar
                      key={p.label}
                      x={barX}
                      y={barY}
                      width={xScale.bandwidth()}
                      height={yMax - barY}
                      fill={fill}
                      rx={3}
                      tabIndex={0}
                      role="img"
                      aria-label={`${p.label}: ${formatValue(p.value)}`}
                      onMouseEnter={show}
                      onFocus={show}
                      onMouseLeave={() => setTip(null)}
                      onBlur={() => setTip(null)}
                    />
                  );
                })}
                <AxisLeft
                  scale={yScale}
                  numTicks={4}
                  stroke={CHART.axis}
                  tickStroke={CHART.axis}
                  tickLabelProps={() => ({
                    fill: CHART.tick,
                    ...CHART.tickFont,
                    textAnchor: 'end' as const,
                    dx: -4,
                    dy: 3,
                  })}
                  tickFormat={(v) => formatValue(Number(v))}
                />
                <AxisBottom
                  top={yMax}
                  scale={xScale}
                  stroke={CHART.axis}
                  tickStroke={CHART.axis}
                  tickLabelProps={() => ({
                    fill: CHART.tick,
                    ...CHART.tickFont,
                    textAnchor: 'middle' as const,
                    dy: 2,
                  })}
                />
              </Group>
            </svg>
          );
        }}
      </ChartFrame>
      <ChartTooltip tip={tip} />
    </div>
  );
}
