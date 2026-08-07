import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { AIActionButton, AIComposer } from './AIComposer';

function Demo({ streaming }: { streaming?: boolean }): React.ReactElement {
  const [value, setValue] = useState('Draft a post about quantum-safe TLS.');
  return (
    <AIComposer
      value={value}
      onValueChange={setValue}
      onSend={() => {}}
      streaming={streaming ?? false}
      onStop={() => {}}
      onAttach={() => {}}
      costWhisper="~420 tokens · ~$0.003"
    />
  );
}

const meta: Meta<typeof AIComposer> = { title: 'ONYX/AI/AIComposer', component: AIComposer };
export default meta;
type Story = StoryObj<typeof AIComposer>;

export const Idle: Story = { render: () => <Demo /> };
export const Streaming: Story = { render: () => <Demo streaming /> };
export const ActionButton: Story = {
  render: () => <AIActionButton>Generate draft</AIActionButton>,
};
