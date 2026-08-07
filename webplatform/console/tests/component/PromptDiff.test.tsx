/**
 * PromptDiff (FS10 T-FS10.5/T-FS10.11). The comparison is computed in the
 * client from two texts the contract already serves — no diff endpoint, no new
 * dependency (plan §5.2 D7) — and rendered with the D2 §13.18 diff semantics
 * (success wash for additions, danger wash for removals) without a syntax
 * highlighter. Colour is never the only signal, so added/removed lines carry a
 * visually-hidden word; that is what these assertions check.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mapPrompt } from '@/entities/prompt';
import { PromptDiff } from '@/widgets/prompts/PromptDiff';

const before = mapPrompt({
  id: 'prm_system_1',
  type: 'system',
  text: 'keep this line\nold wording',
  version: 1,
});
const after = mapPrompt({
  id: 'prm_system_2',
  type: 'system',
  text: 'keep this line\nnew wording\nan added line',
  version: 2,
});

describe('PromptDiff (FS10 T-FS10.5)', () => {
  it('renders the version pair, real counts and the +/- lines', () => {
    const { container } = render(<PromptDiff before={before} after={after} onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: 'v1 → v2' })).toBeInTheDocument();
    expect(screen.getByText('2 lines added · 1 removed')).toBeInTheDocument();

    const text = container.textContent ?? '';
    expect(text).toContain('-old wording');
    expect(text).toContain('+new wording');
    expect(text).toContain('+an added line');
    expect(text).toContain(' keep this line');
  });

  it('does not rely on colour alone — changed lines are labelled for screen readers', () => {
    render(<PromptDiff before={before} after={after} onClose={() => {}} />);
    expect(screen.getAllByText('Added line:').length).toBe(2);
    expect(screen.getAllByText('Removed line:').length).toBe(1);
  });

  it('pulls in no syntax highlighter (a prompt is prose, not code)', () => {
    const { container } = render(<PromptDiff before={before} after={after} onClose={() => {}} />);
    // The frozen CodeBlock adds a language/copy header; this view has neither.
    expect(container.querySelector('[data-language]')).toBeNull();
    expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument();
  });

  it('says so plainly when two versions are identical', () => {
    render(<PromptDiff before={before} after={before} onClose={() => {}} />);
    expect(screen.getByText('These versions are identical.')).toBeInTheDocument();
  });

  it('can be closed (the comparison is a reversible URL state)', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<PromptDiff before={before} after={after} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Hide comparison' }));
    expect(onClose).toHaveBeenCalled();
  });
});
