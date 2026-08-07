import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from '@/shared/ui/empty-state';

describe('EmptyState', () => {
  it('renders explanation and description (D2 §15)', () => {
    render(<EmptyState title="Nothing here" description="Add your first item to begin." />);
    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeInTheDocument();
    expect(screen.getByText('Add your first item to begin.')).toBeInTheDocument();
  });

  it('renders a primary action when provided', () => {
    render(<EmptyState title="Empty" action={<button type="button">Do it</button>} />);
    expect(screen.getByRole('button', { name: 'Do it' })).toBeInTheDocument();
  });
});
