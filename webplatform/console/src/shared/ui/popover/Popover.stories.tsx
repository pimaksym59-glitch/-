import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../button';
import { Popover } from './Popover';

const meta: Meta<typeof Popover> = { title: 'ONYX/Overlays/Popover', component: Popover };
export default meta;
type Story = StoryObj<typeof Popover>;

export const Default: Story = {
  render: () => (
    <Popover trigger={<Button variant="secondary">Details</Button>}>
      <p className="text-[13px] font-semibold text-primary">Retrieval details</p>
      <p className="mt-1 text-[13px] text-secondary">Hybrid search · 12 chunks · RRF fused.</p>
    </Popover>
  ),
};
