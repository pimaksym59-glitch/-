import type { Meta, StoryObj } from '@storybook/react';
import { BarChart } from './BarChart';
import { Donut } from './Donut';
import { Heatmap } from './Heatmap';
import { AreaChart, LineChart } from './LineChart';
import { Sparkline } from './Sparkline';

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SERIES = [
  { name: 'Posts', points: WEEK.map((d, i) => ({ label: d, value: 8 + ((i * 5) % 11) })) },
  { name: 'Drafts', points: WEEK.map((d, i) => ({ label: d, value: 4 + ((i * 3) % 7) })) },
];

const meta: Meta = { title: 'ONYX/Data/Charts' };
export default meta;

export const Line: StoryObj = {
  render: () => <LineChart label="Posts per day" series={SERIES} />,
};
export const Area: StoryObj = {
  render: () => <AreaChart label="Posts per day" series={SERIES.slice(0, 1)} />,
};
export const Bar: StoryObj = {
  render: () => (
    <BarChart
      label="Cost per channel"
      points={[
        { label: 'Tech', value: 18.4 },
        { label: 'Daily', value: 12.1 },
        { label: 'Art', value: 9.6 },
      ]}
      formatValue={(v) => `$${v.toFixed(1)}`}
    />
  ),
};
export const DonutShare: StoryObj = {
  render: () => (
    <Donut
      label="Cost share"
      points={[
        { label: 'LLM', value: 24.2 },
        { label: 'Images', value: 12.4 },
        { label: 'Embeddings', value: 6.2 },
      ]}
      formatValue={(v) => `$${v.toFixed(1)}`}
    />
  ),
};
export const HeatmapPostingTimes: StoryObj = {
  render: () => (
    <Heatmap
      label="Posting heatmap"
      rows={['Morning', 'Noon', 'Evening']}
      columns={WEEK}
      values={[
        [2, 4, 1, 5, 3, 0, 1],
        [5, 7, 6, 8, 9, 2, 3],
        [1, 2, 3, 2, 4, 6, 5],
      ]}
    />
  ),
};
export const SparklineInline: StoryObj = {
  render: () => <Sparkline values={[4, 8, 6, 12, 9, 14, 18]} />,
};
export const LoadingSkeleton: StoryObj = {
  render: () => <LineChart label="Posts per day" series={[]} state="loading" />,
};
export const Empty: StoryObj = {
  render: () => <LineChart label="Posts per day" series={[]} />,
};
export const ErrorChart: StoryObj = {
  render: () => <LineChart label="Posts per day" series={[]} state="error" onRetry={() => {}} />,
};
