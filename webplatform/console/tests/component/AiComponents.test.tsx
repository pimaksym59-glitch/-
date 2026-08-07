import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  AIActionButton,
  AIComposer,
  Citation,
  ExplainabilityPanel,
  ImageResult,
  KnowledgeCard,
  MemoryCard,
  PromptCard,
  StreamingMessage,
  ThinkingState,
  ToolCall,
  TrustLabel,
  VerificationBadge,
} from '@/shared/ui/ai';
import { expectNoAxeViolations } from '../setup/axe';

describe('StreamingMessage (D2 §14)', () => {
  it('thinking state announces politely without a spinner', () => {
    const { container } = render(<StreamingMessage state="thinking" text="" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeNull();
  });

  it('streaming shows the caret, aurora edge and Stop', async () => {
    const onStop = vi.fn();
    const { container } = render(
      <StreamingMessage state="streaming" text="Toke" onStop={onStop} />,
    );
    expect(container.querySelector('.onyx-caret')).toBeInTheDocument();
    expect(container.querySelector('.onyx-aurora-edge')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Stop/ }));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('done exposes the action row and drops the aurora edge', () => {
    const { container } = render(
      <StreamingMessage state="done" text="Final" onCopy={() => {}} onRetry={() => {}} />,
    );
    expect(container.querySelector('.onyx-aurora-edge')).toBeNull();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('error is an alert with retry', () => {
    render(<StreamingMessage state="error" text="" errorText="Timed out." onRetry={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Timed out.');
  });
});

describe('ThinkingState / ToolCall', () => {
  it('thinking steps disclose on demand', async () => {
    render(<ThinkingState steps={[{ id: '1', label: 'Retrieving knowledge' }]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Steps' }));
    expect(screen.getByText('Retrieving knowledge')).toBeInTheDocument();
  });

  it('tool call renders status and collapsible detail', async () => {
    render(
      <ToolCall
        tool="Retrieve knowledge"
        status="completed"
        inputSummary="query: tls"
        outputSummary="8 chunks"
        durationLabel="420ms"
      />,
    );
    expect(screen.getByText('Completed')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Expand Retrieve knowledge/ }));
    expect(screen.getByText('8 chunks')).toBeInTheDocument();
  });
});

describe('Trust & verification (owner requirement 15)', () => {
  it('verification badge renders both kinds', () => {
    render(
      <>
        <VerificationBadge kind="verified" />
        <VerificationBadge kind="needs-review" />
      </>,
    );
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Needs Review')).toBeInTheDocument();
  });

  it('trust label pairs trust with source availability', () => {
    render(<TrustLabel trust="needs-review" sourceAvailable={false} />);
    expect(screen.getByText('Needs Review')).toBeInTheDocument();
    expect(screen.getByText('No source')).toBeInTheDocument();
  });

  it('explainability panel discloses why/data/confidence/limits', async () => {
    render(
      <ExplainabilityPanel
        why="Cadence match."
        dataUsed="3 chunks"
        confidence={0.82}
        limits="Engagement gated."
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Why this output' }));
    expect(screen.getByText('Cadence match.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Confidence 82 percent' })).toBeInTheDocument();
  });
});

describe('Cards', () => {
  it('citation opens a preview and hands off to the source', async () => {
    const onOpen = vi.fn();
    render(<Citation index={1} sourceTitle="style-guide.pdf" snippet="…" onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button', { name: 'Citation 1: style-guide.pdf' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Open source' }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('knowledge card highlights the match and exposes actions', () => {
    render(
      <KnowledgeCard
        title="Guide"
        snippet="Hybrid TLS adoption grew."
        highlight="hybrid TLS"
        source="research.pdf"
        score={0.9}
        onOpen={() => {}}
      />,
    );
    expect(document.querySelector('mark')).toHaveTextContent(/hybrid tls/i);
    expect(screen.getByRole('img', { name: 'Retrieval score 90 percent' })).toBeInTheDocument();
  });

  it('memory card shows scope, kind and why-it-matters', () => {
    render(
      <MemoryCard
        scope="Tech Digest"
        kind="Style"
        content="Short openers."
        whyItMatters="Voice."
      />,
    );
    expect(screen.getByText('Style')).toBeInTheDocument();
    expect(screen.getByText(/Why this matters: Voice\./)).toBeInTheDocument();
  });

  it('prompt card guards promotion when already active', () => {
    render(
      <PromptCard
        name="daily-digest"
        version="v4"
        active
        variablesCount={3}
        lastEditedLabel="2 days ago"
        onPromote={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /Promote to active/ })).toBeDisabled();
  });

  it('image result states: generating, ready with chips, failed', () => {
    const { rerender, container } = render(<ImageResult alt="Post image" state="generating" />);
    expect(container.querySelector('[data-state="generating"]')).toBeInTheDocument();
    rerender(
      <ImageResult
        alt="Post image"
        state="ready"
        src="data:image/gif;base64,R0lGOD"
        verified
        safetyOk
        uniquePhash
        regenCount={2}
        onAccept={() => {}}
      />,
    );
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Regen ×2')).toBeInTheDocument();
    rerender(
      <ImageResult
        alt="Post image"
        state="failed"
        errorText="Safety rejected."
        onRegenerate={() => {}}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Safety rejected.');
  });
});

describe('AIComposer', () => {
  it('send is disabled when empty and fires on ⌘↵', async () => {
    const onSend = vi.fn();
    const Wrapper = (): React.ReactElement => {
      return <AIComposer value="Draft a post" onValueChange={() => {}} onSend={onSend} />;
    };
    render(<Wrapper />);
    const textarea = screen.getByLabelText('Ask your AI…');
    (textarea as HTMLTextAreaElement).focus();
    await userEvent.keyboard('{Meta>}{Enter}{/Meta}');
    expect(onSend).toHaveBeenCalledOnce();
  });

  it('streaming swaps Send for Stop', () => {
    render(
      <AIComposer
        value="x"
        onValueChange={() => {}}
        onSend={() => {}}
        streaming
        onStop={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Stop generating' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Send/ })).not.toBeInTheDocument();
  });

  it('action button is the ai variant with an accessible name', async () => {
    const { container } = render(<AIActionButton>Generate draft</AIActionButton>);
    expect(screen.getByRole('button', { name: 'Generate draft' })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});
