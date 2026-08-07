import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState } from 'react';
import { StreamingMessage } from './StreamingMessage';

const FULL =
  'Here is a draft for **Tech Digest**:\n\n> [!AI] Grounded in 3 knowledge sources[^1].\n\nQuantum-safe cryptography moved from theory to procurement this quarter. Three vendors now ship hybrid TLS…\n\n[^1]: style-guide.pdf';

/** Deterministic token-by-token demo (no Date/random — a fixed interval). */
function StreamingDemo(): React.ReactElement {
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 3;
      setText(FULL.slice(0, i));
      if (i >= FULL.length) {
        setDone(true);
        clearInterval(id);
      }
    }, 40);
    return () => clearInterval(id);
  }, []);
  return (
    <StreamingMessage
      state={done ? 'done' : 'streaming'}
      text={text}
      modelWhisper="claude-opus-4-8 · draft route"
      costWhisper="$0.004 · 1.2s"
      onStop={() => {}}
      onCopy={() => {}}
      onRetry={() => {}}
      onBranch={() => {}}
      onInsertToChannel={() => {}}
      onCite={() => {}}
    />
  );
}

const meta: Meta<typeof StreamingMessage> = {
  title: 'ONYX/AI/StreamingMessage',
  component: StreamingMessage,
};
export default meta;
type Story = StoryObj<typeof StreamingMessage>;

export const Thinking: Story = { args: { state: 'thinking', text: '' } };
export const Streaming: Story = { render: () => <StreamingDemo /> };
export const Done: Story = {
  args: {
    state: 'done',
    text: FULL,
    modelWhisper: 'claude-opus-4-8 · draft route',
    costWhisper: '$0.004 · 1.2s',
    onCopy: () => {},
    onRetry: () => {},
    onBranch: () => {},
    onInsertToChannel: () => {},
    onCite: () => {},
  },
};
export const ErrorState: Story = {
  args: { state: 'error', text: '', errorText: 'The model timed out.', onRetry: () => {} },
};
