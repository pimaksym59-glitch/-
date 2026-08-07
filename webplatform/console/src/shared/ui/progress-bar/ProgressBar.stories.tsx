import type { Meta, StoryObj } from '@storybook/react';
import { ProgressBar } from './ProgressBar';

const meta: Meta<typeof ProgressBar> = {
  title: 'ONYX/Feedback/ProgressBar',
  component: ProgressBar,
  args: { label: 'Upload progress', value: 64 },
};
export default meta;
type Story = StoryObj<typeof ProgressBar>;

export const Default: Story = {};
export const WithValue: Story = { args: { showValue: true } };
export const Complete: Story = { args: { value: 100, showValue: true } };
