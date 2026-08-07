import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton } from './Skeleton';

const meta: Meta<typeof Skeleton> = { title: 'ONYX/Feedback/Skeleton', component: Skeleton };
export default meta;
type Story = StoryObj<typeof Skeleton>;

export const ShapedList: Story = {
  render: () => (
    <div className="flex w-64 flex-col gap-2">
      <Skeleton height={20} width="60%" />
      <Skeleton height={14} />
      <Skeleton height={14} width="85%" />
      <Skeleton height={40} rounded="lg" />
    </div>
  ),
};
