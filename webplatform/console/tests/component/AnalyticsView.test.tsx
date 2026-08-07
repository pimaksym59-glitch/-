/**
 * AnalyticsView integration (FS11 T-FS11.5/T-FS11.12).
 *
 * What is proven here is what the screen exists for: the reliable panels render
 * real served numbers, the **engagement panel renders GATED with no value**,
 * one failing panel never takes the page down (the FS5 isolation proof
 * re-applied), every panel states its provenance, and none of the surfaces the
 * contract cannot back (anomaly, forecast, recommendation, system) is
 * simulated.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as SharedHooks from '@/shared/hooks';
import { mapChannel } from '@/entities/channel';
import { mapCostSeries, mapSnapshotEntries } from '@/entities/analytics-report';
import type { Role } from '@/shared/config/rbac';
import { ANALYTICS, CHANNELS, COST_BY_DAY } from '@/shared/lib/fixtures/dataset';
import { useUiStore } from '@/shared/lib/store';
import {
  AccessibilityProvider,
  AuthProvider,
  NotificationProvider,
  StreamingProvider,
} from '@/shared/providers';
import type { SessionDTO } from '@/shared/types';
import { AnalyticsView, type AnalyticsInitial } from '@/widgets/analytics';
import { server } from '../msw/server';

const inspect = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
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

// Charts are lazy visx chunks; jsdom has no layout, and chart internals are
// covered by the FS3 Chart component tests. Panel semantics are what matter here.
vi.mock('@/shared/ui/chart/lazy', () => ({
  LineChart: ({ label }: { label: string }) => <div data-testid="chart">{label}</div>,
  BarChart: ({ label }: { label: string }) => <div data-testid="chart">{label}</div>,
  Sparkline: () => null,
}));

const TODAY = '2026-08-03';
const RANGE = { from: '2026-07-05', to: TODAY };
const snapshotWire = ANALYTICS['ch_tech'];
if (!snapshotWire) throw new Error('fixture dataset must model ch_tech');

const PROV = {
  endpoint: '/analytics/channels/ch_tech',
  filters: ['2026-07-05 → 2026-08-03'],
  fetchedAt: '2026-08-03T09:00:00Z',
};

const INITIAL: AnalyticsInitial = {
  channels: CHANNELS.map(mapChannel),
  forChannelId: 'ch_tech',
  forRange: RANGE,
  snapshot: {
    metrics: mapSnapshotEntries(snapshotWire),
    series: [],
    provenance: { ...PROV, algorithmVersion: null, computedAt: null },
  },
  cost: mapCostSeries(COST_BY_DAY, 'day', PROV),
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

function renderView(role: Role, initial: AnalyticsInitial = INITIAL) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider session={sessionFor(role)}>
        <AccessibilityProvider>
          <NotificationProvider>
            <StreamingProvider>
              <AnalyticsView initial={initial} today={TODAY} />
            </StreamingProvider>
          </NotificationProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  inspect.mockClear();
  useUiStore.setState({ activeChannelId: 'ch_tech', hydrated: true });
});

describe('AnalyticsView — reliable panels first (D3 §12)', () => {
  it('renders the snapshot metrics from initial data', async () => {
    renderView('editor');
    expect(screen.getByRole('heading', { level: 1, name: 'Analytics' })).toBeInTheDocument();
    expect(await screen.findByText('$4.82')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('renders the cost panel with the contract’s own group_by facets', async () => {
    renderView('editor');
    const group = await screen.findByRole('group', { name: 'Group cost by' });
    for (const facet of ['day', 'channel', 'model', 'provider']) {
      expect(within(group).getByRole('button', { name: facet })).toBeInTheDocument();
    }
  });

  it('states each panel’s provenance, including an absent algorithm version', async () => {
    renderView('editor');
    const whispers = await screen.findAllByTestId('panel-provenance');
    expect(whispers.length).toBeGreaterThan(0);
    expect(
      whispers.some((node) => node.textContent?.includes('no algorithm version reported')),
    ).toBe(true);
  });
});

describe('§R10.3 — engagement is GATED and shows no value', () => {
  it('renders the canonical gated card with no number and no zero', async () => {
    renderView('editor');
    const gated = (await screen.findAllByTestId('gated-panel'))[0];
    expect(gated).toBeDefined();
    expect(gated).toHaveTextContent('Engagement metrics need a stats adapter');
    expect(gated).toHaveTextContent('Views');
    expect(gated).toHaveTextContent('unavailable');
    // The value the fixture would have carried must not appear anywhere.
    expect(gated?.textContent).not.toMatch(/\b0\b/);
  });

  it('never renders a metric card for a gated entry', async () => {
    renderView('editor');
    await screen.findByText('$4.82');
    // Cost and Published are cards; Views/Reactions are not.
    expect(screen.queryByRole('button', { name: /Views/ })).not.toBeInTheDocument();
  });
});

describe('per-panel isolation — one failure never takes the page down', () => {
  it('keeps cost and trends alive when ONLY quality fails', async () => {
    server.use(
      http.get('*/api/v1/analytics/quality', () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    );
    renderView('editor');
    expect(await screen.findByText(/Couldn’t load quality/i)).toBeInTheDocument();
    // The other panels still render their real data.
    expect(await screen.findByRole('heading', { name: 'Cost by day' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Analytics' })).toBeInTheDocument();
  });
});

describe('RBAC — every role reads; only editors may run the AI panel', () => {
  it.each(['owner', 'admin', 'editor', 'analyst', 'viewer'] as const)(
    'renders the full screen for %s',
    async (role) => {
      renderView(role);
      expect(await screen.findByText('$4.82')).toBeInTheDocument();
      expect((await screen.findAllByTestId('gated-panel'))[0]).toBeDefined();
    },
  );

  it('offers the AI panel to an editor and withholds it from an analyst', async () => {
    const { unmount } = renderView('editor');
    expect(
      await screen.findByRole('button', { name: /Explain these numbers/ }),
    ).toBeInTheDocument();
    unmount();
    renderView('analyst');
    await screen.findByText('$4.82');
    expect(screen.queryByRole('button', { name: /Explain these numbers/ })).not.toBeInTheDocument();
  });
});

describe('honest absences — nothing the contract cannot back is simulated', () => {
  it('names anomalies, forecasting, recommendations and system health as absent', async () => {
    renderView('editor');
    expect(
      await screen.findByRole('heading', { name: 'Nothing here is flagged as an anomaly' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Cost history is real; a forecast is not offered' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'No recommendations, and no A/B experiments' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'System health lives elsewhere' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'These numbers are fetched, not streamed' }),
    ).toBeInTheDocument();
  });

  it('renders the onboarding empty state only for a CONFIRMED empty channel list', () => {
    renderView('editor', { ...INITIAL, channels: [] });
    expect(
      screen.getByRole('heading', { name: 'Analytics start with a channel' }),
    ).toBeInTheDocument();
  });
});
