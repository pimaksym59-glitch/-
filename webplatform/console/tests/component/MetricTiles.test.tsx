/**
 * MetricTiles per state (FS5 T-FS5.10): deterministic values from initial
 * data, the honest gated Engagement tile (§R10.3 — copy, never zeros), and
 * PER-CARD ISOLATION — failing ONLY the analytics family leaves the jobs and
 * posts tiles alive (the plan's DoD proof).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mapAnalytics, mapCost } from '@/entities/analytics';
import { mapJob } from '@/entities/job';
import { mapPost } from '@/entities/post';
import { ANALYTICS, COST_BY_DAY, POSTS, TASKS } from '@/shared/lib/fixtures/dataset';
import { MetricTiles, type MetricTilesInitial } from '@/widgets/dashboard';
import { server } from '../msw/server';

// The sparkline is a lazy visx chunk — irrelevant to tile semantics in jsdom.
vi.mock('@/shared/ui/chart/lazy', () => ({ Sparkline: () => null }));

const analyticsWire = ANALYTICS['ch_tech'];
if (!analyticsWire) throw new Error('fixture dataset must model ch_tech');

const FULL_INITIAL: MetricTilesInitial = {
  analytics: mapAnalytics(analyticsWire),
  costs: mapCost(COST_BY_DAY),
  jobs: TASKS.filter((t) => t.channel_id === 'ch_tech').map(mapJob),
  needsReview: POSTS.filter((p) => p.channel_id === 'ch_tech' && p.status === 'needs_review').map(
    mapPost,
  ),
};

function renderTiles(initial: MetricTilesInitial): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MetricTiles channelId="ch_tech" initial={initial} onDrillNeedsReview={() => {}} />
    </QueryClientProvider>,
  );
}

describe('MetricTiles (FS5 T-FS5.8)', () => {
  it('renders the four deterministic tiles from initial data', () => {
    renderTiles(FULL_INITIAL);
    expect(screen.getByText('Cost today')).toBeInTheDocument();
    expect(screen.getByText('$4.82')).toBeInTheDocument();
    expect(screen.getByText('Published today')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    // 2 queued publish slots with a run time.
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Needs Review')).toBeInTheDocument();
  });

  it('renders the honest GATED engagement tile — canonical copy, no zeros (§R10.3)', () => {
    renderTiles(FULL_INITIAL);
    const gated = screen.getByTestId('gated-engagement');
    expect(gated).toHaveTextContent('Engagement');
    expect(gated).toHaveTextContent(
      'Engagement metrics need a stats adapter. Cost, quality, system and diversity are available now.',
    );
    // The gated metric never renders as a number.
    expect(screen.queryByText('Views today')).not.toBeInTheDocument();
  });

  it('ISOLATES a failing metric family: only analytics fails, jobs/posts tiles stay alive', async () => {
    server.use(
      http.get('/api/v1/analytics/*', () =>
        HttpResponse.json({ message: 'analytics down' }, { status: 500 }),
      ),
      http.get('/api/v1/cost', () =>
        HttpResponse.json({ message: 'analytics down' }, { status: 500 }),
      ),
    );
    renderTiles({ ...FULL_INITIAL, analytics: null, costs: null });

    // The failing family renders a section-scope error…
    expect(await screen.findByText('Couldn’t load today’s metrics')).toBeInTheDocument();
    // …while the other families keep rendering their values.
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Needs Review')).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(2);
  });
});
