import type { Meta, StoryObj } from '@storybook/react';
import { TabPanel, Tabs } from './Tabs';

const meta: Meta<typeof Tabs> = {
  title: 'ONYX/Containers/Tabs',
  component: Tabs,
};
export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => (
    <Tabs
      label="Channel sections"
      defaultValue="posts"
      items={[
        { value: 'posts', label: 'Posts', count: 128 },
        { value: 'schedule', label: 'Schedule' },
        { value: 'archived', label: 'Archived', disabled: true },
      ]}
    >
      <TabPanel value="posts">
        <p className="text-sm text-secondary">Posts content.</p>
      </TabPanel>
      <TabPanel value="schedule">
        <p className="text-sm text-secondary">Schedule content.</p>
      </TabPanel>
    </Tabs>
  ),
};
