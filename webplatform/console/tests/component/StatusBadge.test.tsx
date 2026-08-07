import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { STATUS, STATUS_META } from '@/shared/types/status';
import { Badge, StatusBadge } from '@/shared/ui/badge';
import { expectNoAxeViolations } from '../setup/axe';

describe('StatusBadge (registry-driven, D2 §11)', () => {
  it('renders every registered status from the vocabulary', () => {
    render(
      <div>
        {Object.values(STATUS).map((s) => (
          <StatusBadge key={s} status={s} />
        ))}
      </div>,
    );
    for (const status of Object.values(STATUS)) {
      expect(screen.getByText(STATUS_META[status].label)).toBeInTheDocument();
    }
  });

  it('maps tone to the data attribute', () => {
    render(<StatusBadge status={STATUS.failed} />);
    expect(screen.getByText('Failed').closest('[data-tone]')).toHaveAttribute(
      'data-tone',
      'danger',
    );
  });

  it('Badge renders all tones and passes axe', async () => {
    const { container } = render(
      <div>
        {(['neutral', 'info', 'success', 'warning', 'danger', 'ai'] as const).map((tone) => (
          <Badge key={tone} tone={tone}>
            {tone}
          </Badge>
        ))}
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});
