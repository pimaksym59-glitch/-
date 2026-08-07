import { clsx } from 'clsx';
import { BadgeCheck, Info, OctagonAlert, Sparkles, TriangleAlert, X } from 'lucide-react';

/**
 * ToastCard (D2 §13.12) — the presentational body of a toast. Four kinds
 * (success/info/warning/danger) + the AI kind (Aurora edge). Rendered inside
 * Radix Toast.Root by the NotificationProvider; kept presentational so it can
 * be storied and tested without the provider stack. A toast is never the only
 * signal for a critical outcome (the announcer speaks it too).
 */
export type ToastKind = 'success' | 'info' | 'warning' | 'danger' | 'ai';

const KIND_ICON: Record<
  ToastKind,
  React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  success: BadgeCheck,
  info: Info,
  warning: TriangleAlert,
  danger: OctagonAlert,
  ai: Sparkles,
};

const KIND_ICON_CLASS: Record<ToastKind, string> = {
  success: 'text-success',
  info: 'text-info',
  warning: 'text-warning',
  danger: 'text-danger',
  ai: 'text-[color:var(--ai-accent)]',
};

export interface ToastCardProps {
  readonly kind?: ToastKind;
  readonly title: string;
  readonly description?: string;
  readonly action?: React.ReactNode;
  readonly onClose?: () => void;
  readonly className?: string;
}

export function ToastCard({
  kind = 'info',
  title,
  description,
  action,
  onClose,
  className,
}: ToastCardProps): React.ReactElement {
  const Icon = KIND_ICON[kind];
  return (
    <div
      data-kind={kind}
      className={clsx(
        'onyx-floating flex items-start gap-3 rounded-lg p-3',
        kind === 'ai' && 'onyx-aurora-edge',
        className,
      )}
    >
      <Icon
        aria-hidden
        className={clsx('mt-0.5 size-4 shrink-0', KIND_ICON_CLASS[kind])}
        strokeWidth={1.5}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-primary">{title}</p>
        {description ? <p className="mt-0.5 text-[13px] text-secondary">{description}</p> : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
      {onClose ? (
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={onClose}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
