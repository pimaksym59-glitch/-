import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
// Direct imports — the real visx modules, not the lazy wrappers.
import { BarChart, Heatmap, LineChart } from '@/shared/ui/chart';

beforeAll(() => {
  // jsdom has no layout — give the responsive frame a real width.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 400,
    height: 240,
    top: 0,
    left: 0,
    bottom: 240,
    right: 400,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
});

const SERIES = [
  {
    name: 'Posts',
    points: [
      { label: 'Mon', value: 4 },
      { label: 'Tue', value: 8 },
    ],
  },
];

describe('Charts (D2 §13.19 / §12, visx per ADR-FE-1)', () => {
  it('LineChart renders keyboard-focusable, labelled datapoints', () => {
    render(<LineChart label="Posts per day" series={SERIES} />);
    const point = screen.getByRole('img', { name: 'Posts, Tue: 8' });
    expect(point).toHaveAttribute('tabindex', '0');
  });

  it('LineChart with no data renders the honest empty state', () => {
    render(<LineChart label="Posts per day" series={[]} />);
    expect(screen.getByText('No data for this range.')).toBeInTheDocument();
  });

  it('loading renders an axis+shimmer skeleton, not a spinner', () => {
    const { container } = render(<LineChart label="Posts per day" series={[]} state="loading" />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeNull();
  });

  it('BarChart renders labelled bars', () => {
    render(<BarChart label="Cost per channel" points={[{ label: 'Tech', value: 18 }]} />);
    expect(screen.getByRole('img', { name: 'Tech: 18' })).toBeInTheDocument();
  });

  it('Heatmap renders focusable cells with announced values', () => {
    render(<Heatmap label="Posting heatmap" rows={['Morning']} columns={['Mon']} values={[[3]]} />);
    expect(screen.getByRole('img', { name: 'Morning, Mon: 3' })).toBeInTheDocument();
  });
});
