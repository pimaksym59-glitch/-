import { clsx } from 'clsx';
import { getIcon } from '../icon';
import { StatusBadge } from '../badge/Badge';
import { STATUS_META, type Status } from '@/shared/types/status';

/**
 * Timeline (D2 §13.23). Vertical connector + nodes: status icon + title +
 * `<time>` + detail. Ordered-list semantics. Day grouping is composed by the
 * caller (a heading + one Timeline per day), keeping the primitive pure.
 * Used for a post's pipeline history and version history.
 */
export interface TimelineItem {
  readonly id: string;
  readonly status: Status;
  readonly title: string;
  /** Machine-readable timestamp (ISO) for `<time dateTime>`. */
  readonly dateTime: string;
  /** Human-formatted time label (formatting is the caller's, via shared/lib/format). */
  readonly timeLabel: string;
  readonly detail?: string;
  readonly badge?: boolean;
}

export interface TimelineProps {
  readonly label: string;
  readonly items: readonly TimelineItem[];
  readonly className?: string;
}

const NODE_TONE: Record<string, string> = {
  neutral: 'text-secondary',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  ai: 'text-[color:var(--ai-accent)]',
};

export function Timeline({ label, items, className }: TimelineProps): React.ReactElement {
  return (
    <ol aria-label={label} className={clsx('flex flex-col', className)}>
      {items.map((item, index) => {
        const meta = STATUS_META[item.status];
        const Icon = getIcon(meta.icon);
        const last = index === items.length - 1;
        return (
          <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!last ? (
              <span
                aria-hidden
                className="absolute left-[9px] top-6 h-[calc(100%-20px)] w-px bg-[color:var(--border-subtle)]"
              />
            ) : null}
            <span
              aria-hidden
              className={clsx(
                'z-[1] mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-pill bg-surface',
                NODE_TONE[meta.tone],
              )}
            >
              <Icon className="size-4" strokeWidth={1.5} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-primary">{item.title}</span>
                {item.badge ? <StatusBadge status={item.status} /> : null}
                <time dateTime={item.dateTime} className="ml-auto text-xs text-secondary">
                  {item.timeLabel}
                </time>
              </div>
              {item.detail ? (
                <p className="mt-0.5 text-[13px] text-secondary">{item.detail}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
