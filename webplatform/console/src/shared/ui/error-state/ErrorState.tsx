import { clsx } from 'clsx';
import { OctagonAlert } from 'lucide-react';
import { Button } from '../button';

/**
 * ErrorState (D2 §16). Three scopes:
 *  - `inline`  — field/row: message + retry, no chrome;
 *  - `section` — a card fails: compact error card, rest of the page intact;
 *  - `page`    — rare: full state with cause, correlation id, retry + help link.
 * Always specific ("what failed"), never bare "Something went wrong". Network/
 * gated conditions are NOT errors — they render their own states (§R10.3).
 */
export type ErrorScope = 'inline' | 'section' | 'page';

export interface ErrorStateProps {
  readonly scope?: ErrorScope;
  /** What failed, specifically (e.g. "Couldn't load channel analytics"). */
  readonly title: string;
  /** Cause/detail when known. */
  readonly detail?: string;
  readonly correlationId?: string;
  readonly onRetry?: () => void;
  readonly retryLabel?: string;
  /** Help affordance (docs/health link) — page scope. */
  readonly help?: React.ReactNode;
  readonly className?: string;
}

export function ErrorState({
  scope = 'section',
  title,
  detail,
  correlationId,
  onRetry,
  retryLabel = 'Retry',
  help,
  className,
}: ErrorStateProps): React.ReactElement {
  if (scope === 'inline') {
    return (
      <span
        role="alert"
        className={clsx('inline-flex items-center gap-2 text-[13px] text-danger', className)}
      >
        <OctagonAlert aria-hidden className="size-3.5 shrink-0" strokeWidth={1.5} />
        {title}
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="font-medium underline underline-offset-2 hover:text-primary"
          >
            {retryLabel}
          </button>
        ) : null}
      </span>
    );
  }

  if (scope === 'section') {
    return (
      <div
        role="alert"
        className={clsx(
          'flex items-start gap-3 rounded-lg border border-[color:var(--status-danger-fg)] bg-danger-bg p-4',
          className,
        )}
      >
        <OctagonAlert
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-danger"
          strokeWidth={1.5}
        />
        <div className="flex-1">
          <p className="text-sm font-medium text-primary">{title}</p>
          {detail ? <p className="mt-0.5 text-[13px] text-secondary">{detail}</p> : null}
        </div>
        {onRetry ? (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={clsx(
        'mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-16 text-center',
        className,
      )}
    >
      <OctagonAlert aria-hidden className="size-8 text-danger" strokeWidth={1.5} />
      <h2 className="text-lg font-semibold text-primary">{title}</h2>
      {detail ? <p className="text-sm text-secondary">{detail}</p> : null}
      {correlationId ? (
        <p className="font-mono text-xs text-secondary">Correlation id: {correlationId}</p>
      ) : null}
      <div className="mt-2 flex items-center gap-2">
        {onRetry ? <Button onClick={onRetry}>{retryLabel}</Button> : null}
        {help}
      </div>
    </div>
  );
}
