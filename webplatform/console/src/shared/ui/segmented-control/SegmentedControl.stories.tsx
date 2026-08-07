import type { Meta, StoryObj } from '@storybook/react';
import { SegmentedControl } from './SegmentedControl';

const meta: Meta<typeof SegmentedControl> = {
  title: 'ONYX/Form/SegmentedControl',
  component: SegmentedControl,
  args: {
    label: 'Range',
    items: [
      { value: '7d', label: '7d' },
      { value: '30d', label: '30d' },
      { value: '90d', label: '90d' },
    ],
    value: '30d',
  },
};
export default meta;
type Story = StoryObj<typeof SegmentedControl>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
