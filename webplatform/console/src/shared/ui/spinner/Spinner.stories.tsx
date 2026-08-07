import type { Meta, StoryObj } from '@storybook/react';
import { Spinner } from './Spinner';

const meta: Meta<typeof Spinner> = {
  title: 'ONYX/Feedback/Spinner',
  component: Spinner,
};
export default meta;
type Story = StoryObj<typeof Spinner>;

/** Bounded, non-AI waits only — AI surfaces use Thinking/Streaming (D2 §16). */
export const Default: Story = {};
export const Large: Story = { args: { size: 24, label: 'Loading jobs' } };
