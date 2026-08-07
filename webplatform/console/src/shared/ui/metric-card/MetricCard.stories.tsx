import type { Meta, StoryObj } from '@storybook/react';
import { Sparkline } from '../chart/Sparkline';
import { MetricCard } from './MetricCard';

const meta: Meta<typeof MetricCard> = {
  title: 'ONYX/Containers/MetricCard',
  component: MetricCard,
  args: { label: 'Posts published', value: '1,284', delta: '+12%', deltaIsGood: true },
};
export default meta;
type Story = StoryObj<typeof MetricCard>;

export const Default: Story = {};
export const BadDelta: Story = {
  args: { label: 'Failed jobs', value: '7', delta: '+3', deltaIsGood: false },
};
export const WithSparklineAndSource: Story = {
  args: {
    sparkline: <Sparkline values={[4, 8, 6, 12, 9, 14, 18]} />,
    source: 'Cost API · 5m ago',
  },
};
export const Hero: Story = { args: { size: 'lg', value: '$42.80' } };
export const Loading: Story = { args: { loading: true } };
export const Drillable: Story = { args: { onDrill: () => {} } };
