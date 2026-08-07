import type { Meta, StoryObj } from '@storybook/react';
import { ToolCall } from './ToolCall';

const meta: Meta<typeof ToolCall> = {
  title: 'ONYX/AI/ToolCall',
  component: ToolCall,
  args: {
    tool: 'Retrieve knowledge',
    inputSummary: 'query: "quantum-safe TLS", top_k: 8',
    outputSummary: '8 chunks · 3 documents · max score 0.91',
    durationLabel: '420ms',
  },
};
export default meta;
type Story = StoryObj<typeof ToolCall>;

export const Running: Story = { args: { status: 'running' } };
export const Completed: Story = { args: { status: 'completed' } };
export const Failed: Story = { args: { status: 'failed', outputSummary: 'pgvector timeout' } };
