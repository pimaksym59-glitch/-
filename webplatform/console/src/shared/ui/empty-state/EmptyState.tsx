import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { SMALL_TEXT_TONE_CLASS, type SmallTextTone } from '../tone';

/**
 * EmptyState (D2 §15, formalized in FS3). The canonical four-part structure:
 * explanation → what to do → primary CTA → an entry to start. Small text takes
 * a typed `SmallTextTone` (T-FS3.2) — `tertiary` is unrepresentable here; the
 * decorative icon may stay tertiary (≥16px/decorative-meta rule).
 */
export interface EmptyStateProps {
  readonly icon?: LucideIcon;
  readonly title: string;
  readonly description?: string;
  /** Tone of the small description/secondary text (D2 usage rule, typed). */
  readonly tone?: SmallTextTone;
  readonly action?: React.ReactNode;
  readonly secondary?: React.ReactNode;
  readonly className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  tone = 'secondary',
  action,
  secondary,
  className,
}: EmptyStateProps): React.ReactElement {
  return (
    <div
      className={clsx(
        'mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-16 text-center',
        className,
      )}
    >
      {Icon ? <Icon aria-hidden className="size-8 text-tertiary" strokeWidth={1.5} /> : null}
      <h2 className="text-lg font-semibold text-primary">{title}</h2>
      {description ? (
        <p className={clsx('text-sm', SMALL_TEXT_TONE_CLASS[tone])}>{description}</p>
      ) : null}
      {action ? <div className="mt-2 flex items-center gap-2">{action}</div> : null}
      {secondary ? (
        <div className={clsx('text-sm', SMALL_TEXT_TONE_CLASS[tone])}>{secondary}</div>
      ) : null}
    </div>
  );
}
