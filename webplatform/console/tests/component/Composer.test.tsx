/**
 * Composer keyboard contract (FS6 T-FS6.4 — D3 §5): ⌘↵ send, empty-send
 * blocked, ↑ on an empty composer recalls the last user turn, Stop while
 * streaming.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Composer } from '@/features/send-message';

const onSend = vi.fn();
const onStop = vi.fn();
const onValueChange = vi.fn();

function renderComposer(props: { value?: string; streaming?: boolean; last?: string } = {}): void {
  render(
    <Composer
      value={props.value ?? ''}
      onValueChange={onValueChange}
      onSend={onSend}
      streaming={props.streaming ?? false}
      onStop={onStop}
      model="claude-opus-4-8"
      onModelChange={() => {}}
      lastUserPrompt={props.last}
    />,
  );
}

beforeEach(() => {
  onSend.mockClear();
  onStop.mockClear();
  onValueChange.mockClear();
});

describe('Composer (FS6 T-FS6.4)', () => {
  it('blocks empty sends; Send fires with content', async () => {
    renderComposer();
    expect(screen.getByRole('button', { name: /Send/ })).toBeDisabled();

    onValueChange.mockClear();
    await userEvent.type(screen.getByRole('textbox'), 'Draft a post');
    expect(onValueChange).toHaveBeenCalled();
  });

  it('⌘↵ sends when the composer has content', async () => {
    renderComposer({ value: 'Hello' });
    screen.getByRole('textbox').focus();
    await userEvent.keyboard('{Meta>}{Enter}{/Meta}');
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('↑ on an EMPTY composer recalls the last user turn for editing', async () => {
    renderComposer({ last: 'previous prompt' });
    screen.getByRole('textbox').focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(onValueChange).toHaveBeenCalledWith('previous prompt');
  });

  it('↑ with text present does NOT overwrite the draft', async () => {
    renderComposer({ value: 'typing…', last: 'previous prompt' });
    screen.getByRole('textbox').focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(onValueChange).not.toHaveBeenCalledWith('previous prompt');
  });

  it('streaming swaps Send for a working Stop', async () => {
    renderComposer({ streaming: true });
    expect(screen.queryByRole('button', { name: /Send/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Stop generating' }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('exposes the model selector from the registry', () => {
    renderComposer();
    expect(screen.getByRole('combobox', { name: 'Model' })).toBeInTheDocument();
  });
});
