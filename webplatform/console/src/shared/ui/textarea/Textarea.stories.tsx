import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './Textarea';

const meta: Meta<typeof Textarea> = {
  title: 'ONYX/Form/Textarea',
  component: Textarea,
  args: { label: 'Description', placeholder: 'What is this channel about?' },
};
export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {};
export const Invalid: Story = { args: { error: 'Too long — 500 characters max.' } };
export const Disabled: Story = { args: { disabled: true } };
