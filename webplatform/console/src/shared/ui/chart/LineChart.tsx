'use client';

import { AxisBottom, AxisLeft } from '@visx/axis';
import { curveMonotoneX } from '@visx/curve';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { scaleLinear, scalePoint } from '@visx/scale';
import { AreaClosed, LinePath } from '@visx/shape';
import { useState } from 'react';
import { CHART, ChartFrame, type ChartState, ChartTooltip, type ChartTip } from './ChartFrame';

/**
 * LineChart / AreaChart (D2 §13.19 / §12, visx — HEAVY, consume lazily).
 * Token-exact axes/grid/series, tooltip on hover AND keyboard focus (each
 * datapoint is focusable), multi-series via the viz ramp.
 */
export interface ChartPoint {
  readonly label: string;
  readonly value: number;
}

export interface ChartSeries {
  readonly name: string;
  readonly points: readonly ChartPoint[];
}

export interface LineChartProps extends ChartState {
  readonly label: string;
  readonly series: readonly ChartSeries[];
  readonly height?: number;
  readonly area?: boolean;
  readonly formatValue?: (value: number) => string;
  readonly className?: string;
}

const MARGIN = { top: 8, right: 8, bottom: 24, left: 40 };

export function LineChart({
  label,
  series,
  height = 240,
  area = false,
  formatValue = (v) => String(v),
  className,
  ...frame
}: LineChartProps): React.ReactElement {
  const [tip, setTip] = useState<ChartTip | null>(null);
  const labels = series[0]?.points.map((p) => p.label) ?? [];
  const allValues = series.flatMap((s) => s.points.map((p) => p.value));
  const isEmpty = series.length === 0 || allValues.length === 0;

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
          const xScale = scalePoint<string>({ domain: [...labels], range: [0, xMax] });
          const yScale = scaleLinear<number>({
            domain: [0, Math.max(1, ...allValues) * 1.1],
            range: [yMax, 0],
            nice: true,
          });
          return (
            <svg width={width} height={height} aria-hidden={false}>
              <Group left={MARGIN.left} top={MARGIN.top}>
                <GridRows scale={yScale} width={xMax} stroke={CHART.grid} numTicks={4} />
                {series.map((s, si) => {
                  const color = CHART.series(si);
                  return (
                    <Group key={s.name}>
                      {area ? (
                        <AreaClosed
                          data={[...s.points]}
                          x={(d) => xScale(d.label) ?? 0}
                          y={(d) => yScale(d.value)}
                          yScale={yScale}
                          curve={curveMonotoneX}
                          fill={color}
                          fillOpacity={0.12}
                        />
                      ) : null}
                      <LinePath
                        data={[...s.points]}
                        x={(d) => xScale(d.label) ?? 0}
                        y={(d) => yScale(d.value)}
                        curve={curveMonotoneX}
                        stroke={color}
                        strokeWidth={1.5}
                      />
                      {s.points.map((p) => {
                        const cx = (xScale(p.label) ?? 0) + MARGIN.left;
                        const cy = yScale(p.value) + MARGIN.top;
                        const show = (): void =>
                          setTip({
                            x: cx,
                            y: cy,
                            title: `${s.name} · ${p.label}`,
                            value: formatValue(p.value),
                          });
                        return (
                          <circle
                            key={`${s.name}-${p.label}`}
                            cx={xScale(p.label) ?? 0}
                            cy={yScale(p.value)}
                            r={3}
                            fill={color}
                            tabIndex={0}
                            role="img"
                            aria-label={`${s.name}, ${p.label}: ${formatValue(p.value)}`}
                            onMouseEnter={show}
                            onFocus={show}
                            onMouseLeave={() => setTip(null)}
                            onBlur={() => setTip(null)}
                            style={{ outlineOffset: 2 }}
                          />
                        );
                      })}
                    </Group>
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
                  numTicks={Math.min(labels.length, Math.max(2, Math.floor(xMax / 80)))}
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

/** AreaChart is LineChart with the area fill on (D2 §13.19). */
export function AreaChart(props: Omit<LineChartProps, 'area'>): React.ReactElement {
  return <LineChart {...props} area />;
}
