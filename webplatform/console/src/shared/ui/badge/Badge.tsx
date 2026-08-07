import { clsx } from 'clsx';
import { getIcon } from '../icon';
import { STATUS_META, type Status, type StatusTone } from '@/shared/types/status';

/**
 * Badge + StatusBadge (D2 §13 / §11). Badge is the generic tone chip;
 * StatusBadge renders ONLY registered statuses from the single vocabulary
 * (`shared/types/status.ts`) — never a hand-rolled status chip (registry rule).
 */
export interface BadgeProps {
  readonly tone?: StatusTone;
  readonly icon?: React.ReactNode;
  readonly children: React.ReactNode;
  readonly className?: string;
}

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: 'bg-inset text-secondary border-border-default',
  info: 'bg-info-bg text-info border-transparent',
  success: 'bg-success-bg text-success border-transparent',
  warning: 'bg-warning-bg text-warning border-transparent',
  danger: 'bg-danger-bg text-danger border-transparent',
  ai: 'onyx-ai-wash text-[color:var(--ai-accent)] border-transparent',
};

export function Badge({
  tone = 'neutral',
  icon,
  children,
  className,
}: BadgeProps): React.ReactElement {
  return (
    <span
      data-tone={tone}
      className={clsx(
        'inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-xs font-medium',
        TONE_CLASS[tone],
        className,
      )}
    >
      {icon ? (
        <span aria-hidden className="inline-flex size-3 items-center justify-center">
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  );
}

export interface StatusBadgeProps {
  readonly status: Status;
  readonly className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps): React.ReactElement {
  const meta = STATUS_META[status];
  const Icon = getIcon(meta.icon);
  return (
    <Badge
      tone={meta.tone}
      icon={<Icon aria-hidden className="size-3" strokeWidth={2} />}
      {...(className !== undefined ? { className } : {})}
    >
      {meta.label}
    </Badge>
  );
}
