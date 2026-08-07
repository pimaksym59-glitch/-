import type { Meta, StoryObj } from '@storybook/react';
import { MemoryCard } from './MemoryCard';

const meta: Meta<typeof MemoryCard> = {
  title: 'ONYX/AI/MemoryCard',
  component: MemoryCard,
  args: {
    scope: 'Tech Digest',
    kind: 'Style',
    content: 'Prefers short declarative openers; avoids exclamation marks.',
    whyItMatters: 'Applied to every draft in this channel’s voice.',
    onOpenExplorer: () => {},
  },
};
export default meta;
type Story = StoryObj<typeof MemoryCard>;

export const Default: Story = {};
