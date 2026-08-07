import type { Meta, StoryObj } from '@storybook/react';
import { Breadcrumbs } from './Breadcrumbs';

const meta: Meta<typeof Breadcrumbs> = {
  title: 'ONYX/Navigation/Breadcrumbs',
  component: Breadcrumbs,
};
export default meta;
type Story = StoryObj<typeof Breadcrumbs>;

export const TwoLevels: Story = {
  args: {
    items: [{ label: 'Workspace', href: '#' }, { label: 'Dashboard' }],
  },
};
export const TruncatedToThree: Story = {
  args: {
    items: [
      { label: 'Root', href: '#' },
      { label: 'Workspace', href: '#' },
      { label: 'Knowledge', href: '#' },
      { label: 'Post-quantum migration guide' },
    ],
  },
};
