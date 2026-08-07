import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'ONYX/Form/Input',
  component: Input,
  args: { label: 'Channel name', placeholder: 'e.g. Daily Digest' },
};
export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {};
export const WithHelper: Story = { args: { helper: 'Shown to subscribers.' } };
export const Invalid: Story = { args: { error: 'A channel name is required.' } };
export const Disabled: Story = { args: { disabled: true } };
export const ReadOnly: Story = { args: { readOnly: true, defaultValue: 'Daily Digest' } };
