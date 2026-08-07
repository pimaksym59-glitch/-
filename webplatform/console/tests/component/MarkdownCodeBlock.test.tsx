import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
// Direct imports — tests exercise the real modules, not the lazy wrappers.
import { Markdown } from '@/shared/ui/markdown';
import { CodeBlock } from '@/shared/ui/code-block';

// Shiki loads a WASM engine — irrelevant to what these tests assert (the
// immediate plain render + copy/diff behaviour). Mocked to stay deterministic.
vi.mock('shiki', () => ({
  createHighlighter: () => Promise.reject(new Error('shiki disabled in jsdom tests')),
}));

describe('Markdown (D2 §13.17 — sanitized, SEC-4)', () => {
  it('strips raw HTML/script entirely', () => {
    const { container } = render(
      <Markdown>{'Safe <script>alert(1)</script><img src=x onerror=alert(1) /> text'}</Markdown>,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('Safe');
  });

  it('renders GFM tables and task lists', () => {
    render(<Markdown>{'| A | B |\n| --- | --- |\n| 1 | 2 |\n\n- [x] done\n- [ ] open'}</Markdown>);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  });

  it('renders callouts as notes mapped to status tokens', () => {
    const { container } = render(<Markdown>{'> [!WARNING] Engagement is gated.'}</Markdown>);
    const note = screen.getByRole('note');
    expect(note).toHaveAttribute('data-callout', 'warning');
    expect(container).toHaveTextContent('Engagement is gated.');
    expect(container).not.toHaveTextContent('[!WARNING]');
  });

  it('renders footnote references as citation chips that call onCitation', async () => {
    const onCitation = vi.fn();
    render(<Markdown onCitation={onCitation}>{'Claim[^1]\n\n[^1]: source.pdf'}</Markdown>);
    await userEvent.click(screen.getByRole('button', { name: 'Citation 1' }));
    expect(onCitation).toHaveBeenCalledWith(1);
  });
});

describe('CodeBlock (D2 §13.18)', () => {
  beforeAll(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it('renders plain code immediately (highlighting is progressive)', () => {
    render(<CodeBlock code={'const x = 1;'} language="typescript" showLineNumbers />);
    expect(screen.getByText(/const x = 1;/)).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
  });

  it('copy button writes the code and confirms', async () => {
    const onCopied = vi.fn();
    render(<CodeBlock code={'const x = 1;'} language="typescript" onCopied={onCopied} />);
    await userEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('const x = 1;');
    expect(onCopied).toHaveBeenCalledOnce();
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('diff mode tints added and removed lines', () => {
    const { container } = render(<CodeBlock code={'+added\n-removed\n context'} diff />);
    expect(container.querySelector('[data-diff="add"]')).toHaveTextContent('+added');
    expect(container.querySelector('[data-diff="del"]')).toHaveTextContent('-removed');
  });
});
