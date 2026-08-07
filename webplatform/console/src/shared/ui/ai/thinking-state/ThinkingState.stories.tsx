import type { Meta, StoryObj } from '@storybook/react';
import { ThinkingState } from './ThinkingState';

const meta: Meta<typeof ThinkingState> = {
  title: 'ONYX/AI/ThinkingState',
  component: ThinkingState,
};
export default meta;
type Story = StoryObj<typeof ThinkingState>;

export const Default: Story = {};
export const WithSteps: Story = {
  args: {
    steps: [
      { id: '1', label: 'Retrieving channel knowledge' },
      { id: '2', label: 'Selecting topic (avoiding repeats)' },
      { id: '3', label: 'Drafting in channel voice' },
    ],
  },
};
