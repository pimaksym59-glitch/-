/**
 * DashboardView composition (FS5 T-FS5.10 integration): RSC initial data →
 * hydrated islands, per-role rendering (owner acts, analyst/viewer read-only),
 * the honest gated tile, the honest AI seam, and the onboarding empty state.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as SharedHooks from '@/shared/hooks';
import { mapAnalytics, mapCost } from '@/entities/analytics';
import { mapChannel } from '@/entities/channel';
import { mapJob } from '@/entities/job';
import { mapPost } from '@/entities/post';
import type { Role } from '@/shared/config/rbac';
import { ANALYTICS, CHANNELS, COST_BY_DAY, POSTS, TASKS } from '@/shared/lib/fixtures/dataset';
import { useUiStore } from '@/shared/lib/store';
import {
  AccessibilityProvider,
  AuthProvider,
  NotificationProvider,
  StreamingProvider,
} from '@/shared/providers';
import type { SessionDTO } from '@/shared/types';
import { DashboardView, type DashboardInitial } from '@/widgets/dashboard';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('@/shared/hooks', async (importOriginal) => {
  const mod = await importOriginal<typeof SharedHooks>();
  return {
    ...mod,
    useInspector: () => ({ target: null, isOpen: false, inspect: vi.fn(), close: vi.fn() }),
  };
});

// The sparkline is a lazy visx chunk — irrelevant here.
vi.mock('@/shared/ui/chart/lazy', () => ({ Sparkline: () => null }));

const analyticsWire = ANALYTICS['ch_tech'];
if (!analyticsWire) throw new Error('fixture dataset must model ch_tech');

const INITIAL: DashboardInitial = {
  channels: CHANNELS.map(mapChannel),
  forChannelId: 'ch_tech',
  analytics: mapAnalytics(analyticsWire),
  costs: mapCost(COST_BY_DAY),
  jobs: TASKS.filter((t) => t.channel_id === 'ch_tech').map(mapJob),
  needsReview: POSTS.filter((p) => p.channel_id === 'ch_tech' && p.status === 'needs_review').map(
    mapPost,
  ),
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

function renderDashboard(role: Role, initial: DashboardInitial = INITIAL) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider session={sessionFor(role)}>
        <AccessibilityProvider>
          <NotificationProvider>
            <StreamingProvider>
              <DashboardView initial={initial} />
            </StreamingProvider>
          </NotificationProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  push.mockClear();
  useUiStore.setState({ activeChannelId: null, hydrated: false });
});

describe('DashboardView (FS5 T-FS5.8)', () => {
  it('composes the D3 §4 sections from the initial data (owner)', async () => {
    renderDashboard('owner');
    expect(
      screen.getByRole('heading', { level: 1, name: /Good day, Console/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Needs review' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Upcoming schedule' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Recent activity' })).toBeInTheDocument();
    expect(screen.getByText('$4.82')).toBeInTheDocument();
    // FS6: the REAL summary card (lazy) — explicit-action state, no auto-run.
    expect(
      await screen.findByRole('heading', { level: 2, name: '“What changed today?”' }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/only when you ask,\s*never automatically/)).toBeInTheDocument();
    // The gated engagement tile is present and honest.
    expect(screen.getByTestId('gated-engagement')).toBeInTheDocument();
    // Owner can act on the queue.
    expect(screen.getAllByRole('button', { name: /Approve/ }).length).toBeGreaterThan(0);
  });

  it('adopts the first channel when no active channel is set', () => {
    renderDashboard('owner');
    expect(useUiStore.getState().activeChannelId).toBe('ch_tech');
  });

  it('renders read-only for analyst and viewer — same page, no review actions', () => {
    for (const role of ['analyst', 'viewer'] as const) {
      useUiStore.setState({ activeChannelId: null, hydrated: false });
      const { unmount } = renderDashboard(role);
      expect(screen.getByText('$4.82')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Approve/ })).not.toBeInTheDocument();
      unmount();
    }
  });

  it('renders the onboarding hero for a confirmed empty channel list', () => {
    renderDashboard('owner', {
      channels: [],
      forChannelId: null,
      analytics: null,
      costs: null,
      jobs: null,
      needsReview: null,
    });
    expect(screen.getByRole('heading', { name: 'Create your first channel' })).toBeInTheDocument();
  });
});
