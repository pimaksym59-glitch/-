import type { Meta, StoryObj } from '@storybook/react';
import { STATUS } from '@/shared/types/status';
import { Badge, StatusBadge } from './Badge';

const meta: Meta<typeof Badge> = { title: 'ONYX/Status/Badge', component: Badge };
export default meta;
type Story = StoryObj<typeof Badge>;

export const Tones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {(['neutral', 'info', 'success', 'warning', 'danger', 'ai'] as const).map((tone) => (
        <Badge key={tone} tone={tone}>
          {tone}
        </Badge>
      ))}
    </div>
  ),
};

/** The whole 12-status vocabulary, rendered from the registry (D2 §11). */
export const StatusVocabulary: Story = {
  render: () => (
    <div className="flex max-w-md flex-wrap gap-2">
      {Object.values(STATUS).map((status) => (
        <StatusBadge key={status} status={status} />
      ))}
    </div>
  ),
};
