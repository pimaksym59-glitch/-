'use client';

import { clsx } from 'clsx';
import { getIcon } from '../icon';
import { Avatar } from '../avatar/Avatar';
import { Button } from '../button';

/**
 * ActivityFeed (D2 §13.24). Reverse-chron ambient stream of events
 * (who · action · entity · time) with typed icons and load-more. Distinct from
 * Audit — Audit is the formal record, the feed is ambient. New items announce
 * politely (live region).
 */
export interface ActivityEvent {
  readonly id: string;
  readonly actor: string;
  readonly action: string;
  readonly entity: string;
  /** lucide icon name from the shared registry (typed event kind). */
  readonly icon: string;
  readonly dateTime: string;
  readonly timeLabel: string;
  readonly onOpenEntity?: () => void;
}

export interface ActivityFeedProps {
  readonly label: string;
  readonly events: readonly ActivityEvent[];
  readonly onLoadMore?: () => void;
  readonly loadingMore?: boolean;
  readonly className?: string;
}

export function ActivityFeed({
  label,
  events,
  onLoadMore,
  loadingMore = false,
  className,
}: ActivityFeedProps): React.ReactElement {
  return (
    <div className={clsx('flex flex-col gap-3', className)}>
      <ul aria-label={label} aria-live="polite" className="flex flex-col">
        {events.map((event) => {
          const Icon = getIcon(event.icon);
          return (
            <li
              key={event.id}
              className="flex items-center gap-3 border-b border-border-subtle py-2.5 last:border-b-0"
            >
              <span
                aria-hidden
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-pill bg-inset text-secondary"
              >
                <Icon className="size-4" strokeWidth={1.5} />
              </span>
              <Avatar name={event.actor} size={20} decorative />
              <p className="min-w-0 flex-1 truncate text-sm text-secondary">
                <span className="font-medium text-primary">{event.actor}</span> {event.action}{' '}
                {event.onOpenEntity ? (
                  <button
                    type="button"
                    onClick={event.onOpenEntity}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {event.entity}
                  </button>
                ) : (
                  <span className="font-medium text-primary">{event.entity}</span>
                )}
              </p>
              <time dateTime={event.dateTime} className="shrink-0 text-xs text-secondary">
                {event.timeLabel}
              </time>
            </li>
          );
        })}
      </ul>
      {onLoadMore ? (
        <Button variant="secondary" size="sm" loading={loadingMore} onClick={onLoadMore}>
          Load more
        </Button>
      ) : null}
    </div>
  );
}
