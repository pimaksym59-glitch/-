import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../button';
import { ToastCard } from './ToastCard';

const meta: Meta<typeof ToastCard> = {
  title: 'ONYX/Feedback/Toast',
  component: ToastCard,
  args: { title: 'Post published', description: 'Tech Digest · 14:02', onClose: () => {} },
};
export default meta;
type Story = StoryObj<typeof ToastCard>;

export const Success: Story = { args: { kind: 'success' } };
export const Info: Story = { args: { kind: 'info', title: 'Reindexing knowledge' } };
export const Warning: Story = { args: { kind: 'warning', title: 'Rate limit approaching' } };
export const Danger: Story = {
  args: { kind: 'danger', title: 'Publish failed', description: 'Telegram API 429 — will retry.' },
};
export const AI: Story = {
  args: {
    kind: 'ai',
    title: 'Draft ready',
    description: 'A new draft is waiting in Review.',
    action: (
      <Button size="sm" variant="secondary">
        Open
      </Button>
    ),
  },
};
