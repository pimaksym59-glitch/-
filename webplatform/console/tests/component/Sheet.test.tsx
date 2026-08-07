import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Sheet } from '@/shared/ui/sheet';

describe('Sheet (D2 §13.10)', () => {
  it('renders its title and content when open', () => {
    render(
      <Sheet open onOpenChange={vi.fn()} title="Navigation">
        <p>Sheet body</p>
      </Sheet>,
    );

    expect(screen.getByRole('dialog', { name: 'Navigation' })).toBeInTheDocument();
    expect(screen.getByText('Sheet body')).toBeInTheDocument();
  });

  it('closes on Escape (focus trap + esc are owned by Radix)', async () => {
    const onOpenChange = vi.fn();
    render(
      <Sheet open onOpenChange={onOpenChange} title="Navigation">
        <p>Sheet body</p>
      </Sheet>,
    );

    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keeps the title accessible when visually hidden', () => {
    render(
      <Sheet open onOpenChange={vi.fn()} title="Inspector" hideTitle>
        <p>Body</p>
      </Sheet>,
    );

    expect(screen.getByRole('dialog', { name: 'Inspector' })).toBeInTheDocument();
  });
});
