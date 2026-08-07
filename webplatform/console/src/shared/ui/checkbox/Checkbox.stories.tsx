import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'ONYX/Form/Checkbox',
  component: Checkbox,
  args: { label: 'Publish automatically' },
};
export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Off: Story = {};
export const On: Story = { args: { checked: true } };
export const Indeterminate: Story = { args: { checked: 'indeterminate' } };
export const Disabled: Story = { args: { disabled: true, checked: true } };
