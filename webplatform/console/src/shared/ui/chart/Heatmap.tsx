'use client';

import { scaleLinear } from '@visx/scale';
import { useState } from 'react';
import { ChartFrame, type ChartState, ChartTooltip, type ChartTip } from './ChartFrame';

/**
 * Heatmap (D2 §13.19 / §12). A cell grid (e.g. posting-time × weekday)
 * shading a single viz hue by intensity — colorblind-safe by construction.
 * Cells are keyboard-focusable with announced values.
 */
export interface HeatmapProps extends ChartState {
  readonly label: string;
  readonly rows: readonly string[];
  readonly columns: readonly string[];
  /** values[rowIndex][colIndex] */
  readonly values: readonly (readonly number[])[];
  readonly height?: number;
  readonly formatValue?: (value: number) => string;
  readonly className?: string;
}

export function Heatmap({
  label,
  rows,
  columns,
  values,
  height = 240,
  formatValue = (v) => String(v),
  className,
  ...frame
}: HeatmapProps): React.ReactElement {
  const [tip, setTip] = useState<ChartTip | null>(null);
  const flat = values.flat();
  const isEmpty = flat.length === 0;
  const max = Math.max(1, ...flat);
  const opacity = scaleLinear<number>({ domain: [0, max], range: [0.08, 0.95] });
  const LABEL_W = 56;
  const LABEL_H = 18;

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
          const cellW = Math.max(8, (width - LABEL_W) / columns.length - 2);
          const cellH = Math.max(8, (height - LABEL_H) / rows.length - 2);
          return (
            <svg width={width} height={height}>
              {columns.map((c, ci) => (
                <text
                  key={c}
                  x={LABEL_W + ci * (cellW + 2) + cellW / 2}
                  y={12}
                  textAnchor="middle"
                  fill="var(--text-secondary)"
                  fontSize={10}
                  fontFamily="var(--font-mono, monospace)"
                >
                  {c}
                </text>
              ))}
              {rows.map((r, ri) => (
                <g key={r}>
                  <text
                    x={LABEL_W - 8}
                    y={LABEL_H + ri * (cellH + 2) + cellH / 2 + 3}
                    textAnchor="end"
                    fill="var(--text-secondary)"
                    fontSize={10}
                    fontFamily="var(--font-mono, monospace)"
                  >
                    {r}
                  </text>
                  {columns.map((c, ci) => {
                    const v = values[ri]?.[ci] ?? 0;
                    const x = LABEL_W + ci * (cellW + 2);
                    const y = LABEL_H + ri * (cellH + 2);
                    const show = (): void =>
                      setTip({
                        x: x + cellW / 2,
                        y,
                        title: `${r} · ${c}`,
                        value: formatValue(v),
                      });
                    return (
                      <rect
                        key={`${r}-${c}`}
                        x={x}
                        y={y}
                        width={cellW}
                        height={cellH}
                        rx={3}
                        fill="var(--viz-1)"
                        fillOpacity={opacity(v)}
                        tabIndex={0}
                        role="img"
                        aria-label={`${r}, ${c}: ${formatValue(v)}`}
                        onMouseEnter={show}
                        onFocus={show}
                        onMouseLeave={() => setTip(null)}
                        onBlur={() => setTip(null)}
                      />
                    );
                  })}
                </g>
              ))}
            </svg>
          );
        }}
      </ChartFrame>
      <ChartTooltip tip={tip} />
    </div>
  );
}
