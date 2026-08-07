import type { Meta, StoryObj } from '@storybook/react';
import { Select } from './Select';

const ITEMS = [
  { value: 'opus', label: 'claude-opus-4-8' },
  { value: 'haiku', label: 'claude-haiku-4-5' },
  { value: 'off', label: 'Disabled option', disabled: true },
];

const meta: Meta<typeof Select> = {
  title: 'ONYX/Form/Select',
  component: Select,
  args: { label: 'Model', items: ITEMS, placeholder: 'Choose a model…' },
};
export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {};
export const Invalid: Story = { args: { error: 'Pick a model.' } };
export const AsyncLoading: Story = { args: { loading: true } };
export const Disabled: Story = { args: { disabled: true } };
