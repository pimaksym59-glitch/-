import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../button';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'ONYX/Containers/Card',
  component: Card,
  args: {
    title: 'Channel health',
    children: <p className="text-sm text-secondary">All systems nominal. Next post in 2 hours.</p>,
  },
};
export default meta;
type Story = StoryObj<typeof Card>;

export const Static: Story = {};
export const WithActionsAndFooter: Story = {
  args: {
    actions: (
      <Button variant="ghost" size="sm">
        View
      </Button>
    ),
    footer: 'Updated 5 minutes ago',
  },
};
export const Interactive: Story = { args: { variant: 'interactive', onActivate: () => {} } };
export const Selectable: Story = {
  args: { variant: 'selectable', selected: true, onActivate: () => {} },
};
