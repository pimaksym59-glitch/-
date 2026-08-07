import { clsx } from 'clsx';

/**
 * Card (D2 §13.2). Raised elevation, radius.xl, padding 20–24. Slots: header
 * (title + actions), body, footer. Variants: static / interactive /
 * selectable. Interactive cards are real buttons (a11y).
 */
export type CardVariant = 'static' | 'interactive' | 'selectable';

export interface CardProps {
  readonly variant?: CardVariant;
  readonly selected?: boolean;
  readonly onActivate?: () => void;
  readonly title?: string;
  readonly actions?: React.ReactNode;
  readonly footer?: React.ReactNode;
  readonly children?: React.ReactNode;
  readonly className?: string;
}

export function Card({
  variant = 'static',
  selected = false,
  onActivate,
  title,
  actions,
  footer,
  children,
  className,
}: CardProps): React.ReactElement {
  const shell = clsx(
    'onyx-raised block w-full rounded-xl p-5 text-left',
    variant !== 'static' &&
      'transition-[border-color,box-shadow,transform] duration-[120ms] hover:-translate-y-px hover:border-border-strong motion-reduce:hover:translate-y-0',
    variant === 'selectable' &&
      selected &&
      'border-[color:var(--interactive-default)] bg-[color:var(--selection-bg,var(--interactive-subtle))]',
    className,
  );

  const content = (
    <>
      {(title ?? actions) ? (
        <div className="mb-3 flex items-start justify-between gap-3">
          {title ? <h4 className="text-sm font-semibold text-primary">{title}</h4> : <span />}
          {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
        </div>
      ) : null}
      {children}
      {footer ? (
        <div className="mt-4 border-t border-border-subtle pt-3 text-[13px] text-secondary">
          {footer}
        </div>
      ) : null}
    </>
  );

  if (variant === 'static') {
    return <div className={shell}>{content}</div>;
  }
  return (
    <button
      type="button"
      onClick={onActivate}
      aria-pressed={variant === 'selectable' ? selected : undefined}
      className={shell}
    >
      {content}
    </button>
  );
}
