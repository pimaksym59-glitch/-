import type { Meta, StoryObj } from '@storybook/react';
import { ActivityFeed } from './ActivityFeed';

const meta: Meta<typeof ActivityFeed> = {
  title: 'ONYX/Status/ActivityFeed',
  component: ActivityFeed,
};
export default meta;
type Story = StoryObj<typeof ActivityFeed>;

export const Default: Story = {
  render: () => (
    <ActivityFeed
      label="Recent activity"
      onLoadMore={() => {}}
      events={[
        {
          id: '1',
          actor: 'Scheduler',
          action: 'published a post to',
          entity: 'Tech Digest',
          icon: 'send',
          dateTime: '2026-07-29T14:02:00Z',
          timeLabel: '2m ago',
          onOpenEntity: () => {},
        },
        {
          id: '2',
          actor: 'Ada Lovelace',
          action: 'promoted prompt',
          entity: 'daily-digest v4',
          icon: 'library',
          dateTime: '2026-07-29T13:40:00Z',
          timeLabel: '24m ago',
        },
        {
          id: '3',
          actor: 'Validator',
          action: 'flagged an image in',
          entity: 'Art Curator',
          icon: 'flag',
          dateTime: '2026-07-29T13:12:00Z',
          timeLabel: '52m ago',
        },
      ]}
    />
  ),
};
