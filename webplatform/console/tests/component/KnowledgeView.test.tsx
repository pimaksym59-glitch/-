/**
 * KnowledgeView integration (FS7 T-FS7.4): RSC initial data → hydrated list,
 * per-role rendering (editor uploads, analyst/viewer read-only), `j/k/↵` list
 * navigation into the Inspector, the reader (lazy) over MSW detail, the
 * canonical D2 §15 empty state and the retrieval-honesty surface.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as SharedHooks from '@/shared/hooks';
import { mapChannel } from '@/entities/channel';
import { mapDocument } from '@/entities/document';
import type { Role } from '@/shared/config/rbac';
import { CHANNELS, DOCUMENTS, resetFixtureDocumentState } from '@/shared/lib/fixtures/dataset';
import { useUiStore } from '@/shared/lib/store';
import {
  AccessibilityProvider,
  AuthProvider,
  NotificationProvider,
  StreamingProvider,
} from '@/shared/providers';
import type { SessionDTO } from '@/shared/types';
import { KnowledgeView, type KnowledgeInitial } from '@/widgets/knowledge';

const push = vi.fn();
const inspect = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('nuqs', () => ({
  useQueryState: () => [null, vi.fn()],
}));

vi.mock('@/shared/hooks', async (importOriginal) => {
  const mod = await importOriginal<typeof SharedHooks>();
  return {
    ...mod,
    useInspector: () => ({ target: null, isOpen: false, inspect, close: vi.fn() }),
  };
});

vi.mock('@/shared/ui/markdown/lazy', () => ({
  Markdown: ({ children }: { children: string }) => <div>{children}</div>,
}));

const TECH_DOCS = DOCUMENTS.filter((d) => d.channel_id === 'ch_tech').map(mapDocument);

const INITIAL: KnowledgeInitial = {
  channels: CHANNELS.map(mapChannel),
  forChannelId: 'ch_tech',
  documents: TECH_DOCS,
};

function sessionFor(role: Role): SessionDTO {
  return {
    userId: `usr_${role}`,
    email: `${role}@console.local`,
    displayName: `Console ${role}`,
    role,
    mfaEnabled: false,
  };
}

function renderKnowledge(
  role: Role,
  initial: KnowledgeInitial = INITIAL,
  docId: string | null = null,
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider session={sessionFor(role)}>
        <AccessibilityProvider>
          <NotificationProvider>
            <StreamingProvider>
              <KnowledgeView initial={initial} docId={docId} />
            </StreamingProvider>
          </NotificationProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  push.mockClear();
  inspect.mockClear();
  resetFixtureDocumentState();
  useUiStore.setState({ activeChannelId: 'ch_tech', hydrated: true });
});

describe('KnowledgeView (FS7 T-FS7.4)', () => {
  it('renders the channel-scoped list from initial data with ingest statuses (editor)', () => {
    renderKnowledge('editor');
    expect(screen.getByRole('heading', { level: 1, name: 'Knowledge' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add source' })).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Documents' });
    expect(list).toBeInTheDocument();
    expect(screen.getByText('Voice and style guide')).toBeInTheDocument();
    expect(screen.getByText('Product glossary')).toBeInTheDocument();
    // The failed ingest is visible, honestly badged.
    expect(screen.getByText('Q3 vendor sheet')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    // The retrieval-preview region states the truth (no simulated scores).
    expect(screen.getByText(/This console\s+never simulates it/)).toBeInTheDocument();
  });

  it('analyst reads read-only: no Add source, honest copy, list still visible', () => {
    renderKnowledge('analyst');
    expect(screen.queryByRole('button', { name: 'Add source' })).not.toBeInTheDocument();
    expect(screen.getByText(/uploads and AI actions are editor operations/)).toBeInTheDocument();
    expect(screen.getByText('Voice and style guide')).toBeInTheDocument();
  });

  it('`j`/`k` move between rows and `↵` (click) inspects the document', async () => {
    renderKnowledge('editor');
    // The “Open …” affordance shares the title text — anchor on the row name
    // START (the FS6 substring-matching lesson, applied to getByRole).
    const first = screen.getByRole('button', { name: /^Voice and style guide/ });
    first.focus();
    await userEvent.keyboard('j');
    expect(screen.getByRole('button', { name: /^Product glossary/ })).toHaveFocus();
    await userEvent.keyboard('k');
    expect(first).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(inspect).toHaveBeenCalledWith({ type: 'document', id: 'doc_style' });
  });

  it('the explicit Open affordance routes to the reader', async () => {
    renderKnowledge('editor');
    await userEvent.click(screen.getByRole('button', { name: 'Open Voice and style guide' }));
    expect(push).toHaveBeenCalledWith('/knowledge/doc_style');
  });

  it('a confirmed empty list renders the canonical D2 §15 empty state', () => {
    renderKnowledge('editor', { ...INITIAL, documents: [] });
    expect(screen.getByRole('heading', { name: 'Teach the AI what you know' })).toBeInTheDocument();
    expect(
      screen.getByText('Add documents and it will use them, scoped to this channel.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'See how retrieval works' })).toBeInTheDocument();
  });

  it('reader mode loads the document body and offers Ask (editor)', async () => {
    renderKnowledge('editor', INITIAL, 'doc_style');
    expect(
      await screen.findByText('Voice and style guide', undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/calm senior engineer/, undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: /Ask about this document/ }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('list', { name: 'Version history' })).toBeInTheDocument();
  });

  it('reader mode for a viewer: content readable, NO ask affordance', async () => {
    renderKnowledge('viewer', INITIAL, 'doc_style');
    expect(
      await screen.findByText(/calm senior engineer/, undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Ask about this document/ }),
    ).not.toBeInTheDocument();
  });
});
