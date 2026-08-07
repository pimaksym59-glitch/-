import type { Meta, StoryObj } from '@storybook/react';
import { ScrollArea } from './ScrollArea';

const meta: Meta<typeof ScrollArea> = {
  title: 'ONYX/Containers/ScrollArea',
  component: ScrollArea,
};
export default meta;
type Story = StoryObj<typeof ScrollArea>;

export const Default: Story = {
  render: () => (
    <ScrollArea className="h-40 w-56 rounded-lg border border-border-subtle p-2">
      <ul className="flex flex-col gap-1 text-sm text-secondary">
        {Array.from({ length: 24 }, (_, i) => (
          <li key={i} className="rounded-sm px-2 py-1 hover:bg-interactive-subtle">
            Channel item {i + 1}
          </li>
        ))}
      </ul>
    </ScrollArea>
  ),
};
