import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { STATUS } from '@/shared/types/status';
import { ActivityFeed } from '@/shared/ui/activity-feed';
import { ErrorState } from '@/shared/ui/error-state';
import { ProgressBar } from '@/shared/ui/progress-bar';
import { Timeline } from '@/shared/ui/timeline';
import { ToastCard } from '@/shared/ui/toast';
import { expectNoAxeViolations } from '../setup/axe';

describe('ErrorState (D2 §16 scopes)', () => {
  it('inline scope is an alert with retry', async () => {
    const onRetry = vi.fn();
    render(<ErrorState scope="inline" title="Couldn’t save" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t save');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('section scope shows the specific cause', () => {
    render(
      <ErrorState scope="section" title="Couldn’t load analytics" detail="Timed out after 10s." />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Timed out after 10s.');
  });

  it('page scope shows the correlation id', () => {
    render(
      <ErrorState
        scope="page"
        title="Couldn’t load analytics"
        correlationId="018f-abc"
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText(/Correlation id: 018f-abc/)).toBeInTheDocument();
  });
});

describe('ToastCard (D2 §13.12)', () => {
  it('renders every kind with a dismiss button', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <div>
        {(['success', 'info', 'warning', 'danger', 'ai'] as const).map((kind) => (
          <ToastCard key={kind} kind={kind} title={`${kind} toast`} onClose={onClose} />
        ))}
      </div>,
    );
    expect(container.querySelectorAll('[data-kind]')).toHaveLength(5);
    const buttons = screen.getAllByRole('button', { name: 'Dismiss notification' });
    expect(buttons).toHaveLength(5);
    await userEvent.click(buttons[0] as HTMLElement);
    expect(onClose).toHaveBeenCalledOnce();
    await expectNoAxeViolations(container);
  });

  it('the AI kind carries the aurora edge', () => {
    const { container } = render(<ToastCard kind="ai" title="Draft ready" />);
    expect(container.querySelector('[data-kind="ai"]')).toHaveClass('onyx-aurora-edge');
  });
});

describe('ProgressBar', () => {
  it('exposes progressbar semantics and clamps', () => {
    render(<ProgressBar label="Upload progress" value={150} showValue />);
    expect(screen.getByRole('progressbar', { name: 'Upload progress' })).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});

describe('Timeline (D2 §13.23)', () => {
  it('renders ordered nodes with machine-readable time', () => {
    render(
      <Timeline
        label="Post pipeline history"
        items={[
          {
            id: '1',
            status: STATUS.published,
            title: 'Published',
            dateTime: '2026-07-29T14:02:00Z',
            timeLabel: '14:02',
          },
        ]}
      />,
    );
    const list = screen.getByRole('list', { name: 'Post pipeline history' });
    expect(list.querySelector('time')).toHaveAttribute('dateTime', '2026-07-29T14:02:00Z');
  });
});

describe('ActivityFeed (D2 §13.24)', () => {
  it('renders events and load-more', async () => {
    const onLoadMore = vi.fn();
    render(
      <ActivityFeed
        label="Recent activity"
        onLoadMore={onLoadMore}
        events={[
          {
            id: '1',
            actor: 'Scheduler',
            action: 'published a post to',
            entity: 'Tech Digest',
            icon: 'send',
            dateTime: '2026-07-29T14:02:00Z',
            timeLabel: '2m ago',
          },
        ]}
      />,
    );
    expect(screen.getByRole('list', { name: 'Recent activity' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(onLoadMore).toHaveBeenCalledOnce();
  });
});
