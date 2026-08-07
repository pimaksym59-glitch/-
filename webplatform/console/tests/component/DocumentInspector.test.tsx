/**
 * DocumentInspector (FS7 T-FS7.7): overview + versions over node-MSW, the
 * `content.edit` gate on the manage intents (SEC-7 — read roles get NO dead
 * controls), the guarded delete confirm, and the 202 queued-truth wording on
 * re-ingest. Chunk-level detail is honestly absent.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role } from '@/shared/config/rbac';
import { resetFixtureDocumentState } from '@/shared/lib/fixtures/dataset';
import {
  AccessibilityProvider,
  AuthProvider,
  NotificationProvider,
  StreamingProvider,
} from '@/shared/providers';
import type { SessionDTO } from '@/shared/types';
import { DocumentInspector } from '@/widgets/inspector/DocumentInspector';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/knowledge',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('nuqs', () => ({
  useQueryState: () => [null, vi.fn()],
}));

function sessionFor(role: Role): SessionDTO {
  return {
    userId: `usr_${role}`,
    email: `${role}@console.local`,
    displayName: `Console ${role}`,
    role,
    mfaEnabled: false,
  };
}

function renderInspector(role: Role, id = 'doc_style') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider session={sessionFor(role)}>
        <AccessibilityProvider>
          <NotificationProvider>
            <StreamingProvider>
              <DocumentInspector id={id} />
            </StreamingProvider>
          </NotificationProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  push.mockClear();
  resetFixtureDocumentState();
});

describe('DocumentInspector (FS7 T-FS7.7)', () => {
  it('editor: overview, manage intents, versions timeline', async () => {
    renderInspector('editor');
    expect(await screen.findByText('Voice and style guide')).toBeInTheDocument();
    expect(screen.getByText(/style-guide\.md/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Re-ingest/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/ })).toBeInTheDocument();
    expect(screen.getByText('Assign to channel')).toBeInTheDocument();
    expect(await screen.findByRole('list', { name: 'Version history' })).toBeInTheDocument();
    // Honestly absent: no chunk/score claims anywhere.
    expect(screen.queryByText(/chunk/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/score/i)).not.toBeInTheDocument();
  });

  it('viewer: read-only — overview + versions, NO manage intents', async () => {
    renderInspector('viewer');
    expect(await screen.findByText('Voice and style guide')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Re-ingest/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Assign to channel')).not.toBeInTheDocument();
  });

  it('re-ingest speaks 202 queued-truth (“queued”, never “done”)', async () => {
    renderInspector('editor');
    await userEvent.click(await screen.findByRole('button', { name: /Re-ingest/ }));
    // Toast copy appears twice in strict mode (toast + polite announcer) —
    // the FS5 lesson; assert on presence, not uniqueness.
    expect((await screen.findAllByText('Re-ingest queued')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/task task_reindex_doc_style/).length).toBeGreaterThan(0);
  });

  it('delete requires the confirm dialog', async () => {
    renderInspector('editor');
    await userEvent.click(await screen.findByRole('button', { name: /^Delete$/ }));
    expect(await screen.findByText('Delete this document?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete document' }));
    expect((await screen.findAllByText('Document deleted')).length).toBeGreaterThan(0);
  });
});
