import type { Meta, StoryObj } from '@storybook/react';
import { Divider } from './Divider';

const meta: Meta<typeof Divider> = { title: 'ONYX/Containers/Divider', component: Divider };
export default meta;
type Story = StoryObj<typeof Divider>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-64">
      <p className="text-sm text-secondary">Above</p>
      <Divider className="my-3" />
      <p className="text-sm text-secondary">Below</p>
    </div>
  ),
};
export const Vertical: Story = {
  render: () => (
    <div className="flex h-8 items-center gap-3 text-sm text-secondary">
      Left <Divider orientation="vertical" /> Right
    </div>
  ),
};
