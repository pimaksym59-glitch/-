/**
 * DatapointInspector (FS11 T-FS11.8/T-FS11.12).
 *
 * The contract has **no per-datapoint endpoint**, so the proof that matters is
 * negative: this view resolves from the cache the panels already filled and
 * issues NO request. When the cache is cold it says so instead of showing a
 * plausible number.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { analyticsKeys, mapPanel, type PanelVM } from '@/entities/analytics-report';
import { DatapointInspector } from '@/widgets/inspector/DatapointInspector';

const params = new URLSearchParams({ from: '2026-07-05', to: '2026-08-03' });

vi.mock('next/navigation', () => ({
  useSearchParams: () => params,
}));

const RANGE = { from: '2026-07-05', to: '2026-08-03' };

const QUALITY: PanelVM = mapPanel(
  {
    metrics: {
      quality_score: { value: 82.4, unit: '/100' },
      style_drift_index: { value: 0.13 },
      er: { value: 0.071, availability: 'gated' },
    },
    algorithm_version: 'quality-v3',
  },
  {
    endpoint: '/analytics/quality?from=2026-07-05&to=2026-08-03',
    filters: ['2026-07-05 → 2026-08-03'],
    fetchedAt: '2026-08-03T09:30:00Z',
  },
);

function renderInspector(id: string, seed = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (seed) client.setQueryData(analyticsKeys.quality(RANGE), QUALITY);
  const spy = vi.spyOn(globalThis, 'fetch');
  render(
    <QueryClientProvider client={client}>
      <DatapointInspector id={id} />
    </QueryClientProvider>,
  );
  return spy;
}

describe('DatapointInspector', () => {
  it('resolves a metric from the cache and shows its provenance', () => {
    const fetchSpy = renderInspector('quality.quality_score');
    expect(screen.getByRole('heading', { name: 'Quality score' })).toBeInTheDocument();
    expect(screen.getByText('82.4')).toBeInTheDocument();
    expect(screen.getByText('/100')).toBeInTheDocument();
    expect(screen.getByText('quality-v3')).toBeInTheDocument();
    expect(
      screen.getByText('/analytics/quality?from=2026-07-05&to=2026-08-03'),
    ).toBeInTheDocument();
    // The whole point: nothing was requested to open this panel.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('keeps an unrecognised key’s raw name and marks it', () => {
    renderInspector('quality.style_drift_index');
    expect(screen.getByRole('heading', { name: /style_drift_index/ })).toBeInTheDocument();
    expect(screen.getByText('(raw key)')).toBeInTheDocument();
  });

  it('reports an absent algorithm version rather than inventing one', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(
      analyticsKeys.quality(RANGE),
      mapPanel(
        { metrics: { posts: 4 } },
        { endpoint: '/analytics/quality', filters: [], fetchedAt: '2026-08-03T09:30:00Z' },
      ),
    );
    render(
      <QueryClientProvider client={client}>
        <DatapointInspector id="quality.posts" />
      </QueryClientProvider>,
    );
    expect(screen.getByText('not reported')).toBeInTheDocument();
    expect(screen.getByText('none')).toBeInTheDocument();
  });

  it('states the honest cold-cache case instead of fetching', () => {
    const fetchSpy = renderInspector('quality.quality_score', false);
    expect(screen.getByText(/not loaded in this browser/i)).toBeInTheDocument();
    expect(screen.getByText(/no per-datapoint endpoint/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
