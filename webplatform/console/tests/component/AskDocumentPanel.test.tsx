/**
 * AskDocumentPanel (FS7 T-FS7.6): NOTHING auto-runs; Summarize streams over
 * the MSW SSE relay and finishes with wire cost/model; the answer carries
 * Trust (Generated · Source Available), a Citation resolving to the REAL
 * source document, a KnowledgeCard WITHOUT a score bar, and Explainability
 * with confidence honestly absent.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as SharedHooks from '@/shared/hooks';
import { mapDocumentDetail } from '@/entities/document';
import { useAssistantStore } from '@/shared/lib/stream';
import {
  AccessibilityProvider,
  AuthProvider,
  NotificationProvider,
  StreamingProvider,
} from '@/shared/providers';
import type { SessionDTO } from '@/shared/types';
import { AskDocumentPanel } from '@/features/ask-document';

const inspect = vi.fn();

vi.mock('@/shared/hooks', async (importOriginal) => {
  const mod = await importOriginal<typeof SharedHooks>();
  return {
    ...mod,
    useInspector: () => ({ target: null, isOpen: false, inspect, close: vi.fn() }),
  };
});

// The streamed answer renders through the lazy markdown pipeline — mocked so
// assertions see the raw text (the ChatView test precedent).
vi.mock('@/shared/ui/markdown/lazy', () => ({
  Markdown: ({ children }: { children: string }) => <div>{children}</div>,
}));

const DOC = mapDocumentDetail({
  id: 'doc_style',
  title: 'Voice and style guide',
  source: 'style-guide.md',
  size_bytes: 18_432,
  status: 'completed',
  channel_id: 'ch_tech',
  version: 3,
  created_at: '2026-07-20T10:00:00Z',
  updated_at: '2026-07-28T09:15:00Z',
  content: '# Voice\n\nShort sentences. Concrete numbers.',
  content_type: 'text/markdown',
});

const SESSION: SessionDTO = {
  userId: 'usr_editor',
  email: 'editor@console.local',
  displayName: 'Console editor',
  role: 'editor',
  mfaEnabled: false,
};

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider session={SESSION}>
        <AccessibilityProvider>
          <NotificationProvider>
            <StreamingProvider>
              <AskDocumentPanel doc={DOC} />
            </StreamingProvider>
          </NotificationProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  inspect.mockClear();
  useAssistantStore.setState({ slices: {}, stops: {} });
});

describe('AskDocumentPanel (FS7 T-FS7.6)', () => {
  it('renders idle with NO output — nothing auto-runs (cost honesty)', () => {
    renderPanel();
    expect(screen.getByText(/when you ask, never\s+automatically/)).toBeInTheDocument();
    expect(screen.queryByTestId('ask-document-output')).not.toBeInTheDocument();
  });

  it('Summarize streams to done: wire cost/model, Trust, real-source Citation, scoreless KnowledgeCard, Explainability', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Summarize document' }));

    // Anchor on the DONE marker (wire cost) — the transient streaming node is
    // replaced on completion (the FS6 E2E lesson applies to RTL too).
    expect(await screen.findByText('$0.0042', undefined, { timeout: 5000 })).toBeInTheDocument();
    // The fixture echoes the first prompt line — proving the document prompt
    // actually crossed the wire.
    expect(
      screen.getByText(/You asked: Answer a question about the document "Voice and style guide"/),
    ).toBeInTheDocument();

    // Trust + provenance: the citation resolves to the ACTUAL source document.
    expect(screen.getByText('Generated')).toBeInTheDocument();
    const citation = screen.getByRole('button', {
      name: 'Citation 1: Voice and style guide',
    });
    await userEvent.click(citation);
    await userEvent.click(await screen.findByRole('button', { name: 'Open source' }));
    expect(inspect).toHaveBeenCalledWith({ type: 'document', id: 'doc_style' });

    // KnowledgeCard: real document data, NO retrieval-score bar (none exists).
    expect(screen.getByText('style-guide.md')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Retrieval score/ })).not.toBeInTheDocument();

    // Explainability (collapsed by default — expand the disclosure):
    // provenance stated; confidence honestly ABSENT (no wire source).
    await userEvent.click(screen.getByRole('button', { name: /Why this output/ }));
    expect(screen.getByText(/Nothing else entered the prompt/)).toBeInTheDocument();
    expect(screen.getByText(/not at model-claimed sources/)).toBeInTheDocument();
    expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument();
  });

  it('Ask with a custom question sends it (echoed by the fixture)', async () => {
    renderPanel();
    await userEvent.type(
      screen.getByLabelText('Question about this document'),
      'What tone applies?',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));
    expect(await screen.findByText('$0.0042', undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByTestId('ask-document-output')).toBeInTheDocument();
  });
});
