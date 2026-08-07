import type { Meta, StoryObj } from '@storybook/react';
import { STATUS } from '@/shared/types/status';
import { Timeline } from './Timeline';

const meta: Meta<typeof Timeline> = { title: 'ONYX/Status/Timeline', component: Timeline };
export default meta;
type Story = StoryObj<typeof Timeline>;

export const PipelineHistory: Story = {
  render: () => (
    <Timeline
      label="Post pipeline history"
      items={[
        {
          id: '1',
          status: STATUS.published,
          title: 'Published to Tech Digest',
          dateTime: '2026-07-29T14:02:00Z',
          timeLabel: '14:02',
          badge: true,
        },
        {
          id: '2',
          status: STATUS.verified,
          title: 'Validation passed',
          dateTime: '2026-07-29T14:00:00Z',
          timeLabel: '14:00',
          detail: '6 gates · humanness 0.92',
        },
        {
          id: '3',
          status: STATUS.needsReview,
          title: 'Image flagged for review',
          dateTime: '2026-07-29T13:58:00Z',
          timeLabel: '13:58',
          detail: 'Perceptual-hash near-duplicate',
          badge: true,
        },
        {
          id: '4',
          status: STATUS.completed,
          title: 'Draft generated',
          dateTime: '2026-07-29T13:55:00Z',
          timeLabel: '13:55',
        },
      ]}
    />
  ),
};
