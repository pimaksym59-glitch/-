import type { Meta, StoryObj } from '@storybook/react';
import { BookOpen } from 'lucide-react';
import { Button } from '../button';
import { EmptyState } from './EmptyState';

const meta: Meta<typeof EmptyState> = {
  title: 'ONYX/EmptyState',
  component: EmptyState,
};
export default meta;

type Story = StoryObj<typeof EmptyState>;

export const Knowledge: Story = {
  args: {
    icon: BookOpen,
    title: 'Teach the AI what you know',
    description: 'Add documents and it will use them, scoped to this channel.',
    action: <Button>Add source</Button>,
    secondary: 'See how retrieval works',
  },
};
