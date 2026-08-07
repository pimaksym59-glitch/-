'use client';

/** Lazy entrypoint — keeps visx out of First Load (ADR-FE-1 discipline). */
import dynamic from 'next/dynamic';
import { Skeleton } from '../skeleton';

const chartLoading = (): React.ReactElement => <Skeleton height={240} />;

export const LineChart = dynamic(() => import('./LineChart').then((m) => m.LineChart), {
  loading: chartLoading,
});
export const AreaChart = dynamic(() => import('./LineChart').then((m) => m.AreaChart), {
  loading: chartLoading,
});
export const BarChart = dynamic(() => import('./BarChart').then((m) => m.BarChart), {
  loading: chartLoading,
});
export const Donut = dynamic(() => import('./Donut').then((m) => m.Donut), {
  loading: chartLoading,
});
export const Heatmap = dynamic(() => import('./Heatmap').then((m) => m.Heatmap), {
  loading: chartLoading,
});
export const Sparkline = dynamic(() => import('./Sparkline').then((m) => m.Sparkline), {
  loading: () => <Skeleton width={96} height={28} />,
});
