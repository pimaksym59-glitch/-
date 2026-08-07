/**
 * ChatView integration (FS6 T-FS6.6): empty state → suggestion prefill →
 * send → user turn persisted + assistant turn streamed (MSW SSE) and
 * reconciled with wire cost; the conversation lands in the single repository.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as SharedHooks from '@/shared/hooks';
import {
  getConversationRepository,
  resetConversationRepositoryForTests,
  useConversationStore,
} from '@/entities/conversation';
import type { Role } from '@/shared/config/rbac';
import {
  AccessibilityProvider,
  AuthProvider,
  NotificationProvider,
  StreamingProvider,
} from '@/shared/providers';
import type { SessionDTO } from '@/shared/types';
import { ChatView } from '@/widgets/chat';

const push = vi.fn();
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace, refresh: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('nuqs', () => ({
  useQueryState: () => [null, vi.fn()],
}));

vi.mock('@/shared/hooks', async (importOriginal) => {
  const mod = await importOriginal<typeof SharedHooks>();
  return {
    ...mod,
    useInspector: () => ({ target: null, isOpen: false, inspect: vi.fn(), close: vi.fn() }),
  };
});

vi.mock('@/shared/ui/markdown/lazy', () => ({
  Markdown: ({ children }: { children: string }) => <div>{children}</div>,
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

function renderChat(conversationId: string | null = null): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AuthProvider session={sessionFor('editor')}>
        <AccessibilityProvider>
          <NotificationProvider>
            <StreamingProvider>
              <ChatView conversationId={conversationId} />
            </StreamingProvider>
          </NotificationProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  push.mockClear();
  replace.mockClear();
  window.localStorage.clear();
  resetConversationRepositoryForTests();
  useConversationStore.setState({ hydrated: false, conversations: [], messages: {} });
  // jsdom has no layout — the virtualized thread needs a real-ish viewport
  // rect to render its rows (the FS3 Chart-test precedent).
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 800,
    height: 600,
    top: 0,
    left: 0,
    bottom: 600,
    right: 800,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
});

describe('ChatView (FS6 T-FS6.6)', () => {
  it('renders the D2 §15 empty state; a suggestion prefills the composer', async () => {
    renderChat();
    expect(screen.getByText('Start a conversation')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Draft a post about our latest release' }),
    );
    expect(screen.getByRole('textbox')).toHaveValue('Draft a post about our latest release');
    // Local-first honesty is stated on the rail.
    expect(screen.getAllByText(/live in this browser only/).length).toBeGreaterThan(0);
  });

  it('a FIRST send creates the conversation, navigates to it, and completes in the repository', async () => {
    renderChat();
    await userEvent.type(screen.getByRole('textbox'), 'Draft something great');
    await userEvent.click(screen.getByRole('button', { name: /Send/ }));

    // The first send creates the conversation and navigates to it (the real
    // router remounts the view under the new id; the mock only records it).
    expect(replace).toHaveBeenCalledWith(expect.stringMatching(/^\/chat\/conv_/));

    // The run finishes in the SINGLE repository regardless of navigation.
    await vi.waitFor(() => {
      const conversations = getConversationRepository().listConversations();
      expect(conversations).toHaveLength(1);
      const messages = getConversationRepository().listMessages(conversations[0]?.id ?? '');
      expect(messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    });
  });

  it('sending in an existing thread streams the turn on screen and reconciles wire cost', async () => {
    const created = useConversationStore.getState().createConversation({
      title: 'Existing thread',
      model: 'claude-opus-4-8',
    });
    renderChat(created.id);

    await userEvent.type(screen.getByRole('textbox'), 'Draft something great');
    await userEvent.click(screen.getByRole('button', { name: /Send/ }));

    expect(screen.getByText('Draft something great')).toBeInTheDocument();
    // Anchor on the DONE marker (wire cost) — the streaming node is transient.
    expect(await screen.findByText('$0.0042')).toBeInTheDocument();
    // Thread message + rail snippet both carry the reply — at least one each.
    expect(screen.getAllByText(/Deterministic fixture reply/).length).toBeGreaterThan(0);

    const messages = getConversationRepository().listMessages(created.id);
    expect(messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(messages[1]?.costUsd).toBe(0.0042);
    expect(messages[1]?.status).toBe('complete');
  });
});
