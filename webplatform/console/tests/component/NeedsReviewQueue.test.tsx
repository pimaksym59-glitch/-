/**
 * NeedsReviewQueue (FS5 T-FS5.10): rows from the deterministic queue, `j`/`k`
 * row navigation + `↵` opening the Inspector, RBAC-hidden review actions
 * (SEC-7), and the honest 202 "queued" toast on approve.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as SharedHooks from '@/shared/hooks';
import { mapPost } from '@/entities/post';
import type { Role } from '@/shared/config/rbac';
import { POSTS } from '@/shared/lib/fixtures/dataset';
import { AccessibilityProvider, AuthProvider, NotificationProvider } from '@/shared/providers';
import type { SessionDTO } from '@/shared/types';
import { NeedsReviewQueue } from '@/widgets/dashboard';

const inspectSpy = vi.hoisted(() => vi.fn());

vi.mock('@/shared/hooks', async (importOriginal) => {
  const mod = await importOriginal<typeof SharedHooks>();
  return {
    ...mod,
    useInspector: () => ({
      target: null,
      isOpen: false,
      inspect: inspectSpy,
      close: vi.fn(),
    }),
  };
});

const INITIAL = POSTS.filter((p) => p.channel_id === 'ch_tech' && p.status === 'needs_review').map(
  mapPost,
);

function sessionFor(role: Role): SessionDTO {
  return {
    userId: `usr_${role}`,
    email: `${role}@console.local`,
    displayName: `Console ${role}`,
    role,
    mfaEnabled: false,
  };
}

function renderQueue(role: Role): { unmount: () => void } {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider session={sessionFor(role)}>
        <AccessibilityProvider>
          <NotificationProvider>
            <NeedsReviewQueue channelId="ch_tech" initial={INITIAL} />
          </NotificationProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  inspectSpy.mockClear();
});

describe('NeedsReviewQueue (FS5 T-FS5.8)', () => {
  it('renders the deterministic queue rows with status badges', () => {
    renderQueue('owner');
    const list = screen.getByRole('list', { name: 'Needs review' });
    expect(list).toBeInTheDocument();
    expect(screen.getByText('Quantum-safe TLS moves to procurement')).toBeInTheDocument();
    expect(screen.getByText('The quiet return of on-prem inference')).toBeInTheDocument();
    expect(screen.getAllByText('Needs Review').length).toBe(2);
  });

  it('j/k moves focus between rows and ↵ opens the post Inspector', async () => {
    renderQueue('owner');
    const first = screen.getByRole('button', { name: /Quantum-safe TLS/ });
    first.focus();

    await userEvent.keyboard('j');
    expect(document.activeElement).toHaveTextContent('The quiet return of on-prem inference');

    await userEvent.keyboard('k');
    expect(document.activeElement).toHaveTextContent('Quantum-safe TLS moves to procurement');

    await userEvent.keyboard('{Enter}');
    expect(inspectSpy).toHaveBeenCalledWith({ type: 'post', id: 'post_nr_1' });
  });

  it('offers review actions to a role with content.publish (owner)', () => {
    renderQueue('owner');
    expect(screen.getAllByRole('button', { name: /Approve/ }).length).toBe(2);
    expect(screen.getAllByRole('button', { name: 'Reject post' }).length).toBe(2);
  });

  it('HIDES review actions from analyst and viewer (SEC-7 — never listed)', () => {
    for (const role of ['analyst', 'viewer'] as const) {
      const { unmount } = renderQueue(role);
      expect(screen.queryByRole('button', { name: /Approve/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Reject post' })).not.toBeInTheDocument();
      expect(screen.getByText('Quantum-safe TLS moves to procurement')).toBeInTheDocument();
      unmount();
    }
  });

  it('approve fires the 202 queue intent and shows the honest "queued" toast', async () => {
    renderQueue('owner');
    const approve = screen.getAllByRole('button', { name: /Approve/ })[0];
    expect(approve).toBeDefined();
    await userEvent.click(approve as HTMLElement);
    // The fixture answers 202 {task_id} — the UI must say "queued", not "done".
    expect(await screen.findByText('Approval queued')).toBeInTheDocument();
  });
});
