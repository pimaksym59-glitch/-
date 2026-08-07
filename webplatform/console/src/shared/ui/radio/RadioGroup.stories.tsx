import type { Meta, StoryObj } from '@storybook/react';
import { RadioGroup } from './RadioGroup';

const meta: Meta<typeof RadioGroup> = {
  title: 'ONYX/Form/RadioGroup',
  component: RadioGroup,
  args: {
    label: 'Publishing mode',
    items: [
      { value: 'auto', label: 'Autonomous' },
      { value: 'review', label: 'Review first' },
      { value: 'manual', label: 'Manual', disabled: true },
    ],
  },
};
export default meta;
type Story = StoryObj<typeof RadioGroup>;

export const Vertical: Story = { args: { value: 'auto' } };
export const Horizontal: Story = { args: { orientation: 'horizontal', value: 'review' } };
