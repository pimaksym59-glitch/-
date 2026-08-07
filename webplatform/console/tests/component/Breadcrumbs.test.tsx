import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';

describe('Breadcrumbs (D1 §6.6 / D2 §13.9)', () => {
  it('marks the last crumb as the current page and does not link it', () => {
    render(<Breadcrumbs items={[{ label: 'Workspace', href: '/' }, { label: 'Analytics' }]} />);

    const current = screen.getByText('Analytics');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Workspace' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Analytics' })).not.toBeInTheDocument();
  });

  it('never renders more than three crumbs', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'One', href: '/1' },
          { label: 'Two', href: '/2' },
          { label: 'Three', href: '/3' },
          { label: 'Four' },
        ]}
      />,
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.queryByText('One')).not.toBeInTheDocument();
    expect(screen.getByText('Four')).toBeInTheDocument();
  });

  it('exposes a labelled navigation landmark', () => {
    render(<Breadcrumbs items={[{ label: 'Only' }]} />);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
  });

  it('renders nothing when empty', () => {
    const { container } = render(<Breadcrumbs items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
