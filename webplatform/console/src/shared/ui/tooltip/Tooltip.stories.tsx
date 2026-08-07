import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../button';
import { Tooltip, TooltipProvider } from './Tooltip';

const meta: Meta<typeof Tooltip> = {
  title: 'ONYX/Overlays/Tooltip',
  component: Tooltip,
  decorators: [
    (Story) => (
      <TooltipProvider delayDuration={200}>
        <Story />
      </TooltipProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  render: () => (
    <Tooltip content="Dashboard" side="right">
      <Button variant="secondary">Hover me</Button>
    </Tooltip>
  ),
};
export const InstantTop: Story = {
  render: () => (
    <Tooltip content="No delay" side="top" delayMs={0}>
      <Button variant="ghost">Top</Button>
    </Tooltip>
  ),
};
