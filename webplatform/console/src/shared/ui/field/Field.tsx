import { clsx } from 'clsx';
import { useId } from 'react';

/**
 * Field chrome shared by Input/Textarea/Select/Combobox (D2 §13.3/§13.4).
 * Owns the label (always present — visible or sr-only), helper/error text and
 * the aria wiring (`aria-invalid`, `aria-describedby`). Not exported from the
 * library root — form components compose it.
 */
export interface FieldChromeProps {
  readonly label: string;
  readonly hideLabel?: boolean;
  readonly helper?: string;
  readonly error?: string;
  readonly className?: string;
  readonly children: (field: {
    readonly id: string;
    readonly describedBy: string | undefined;
    readonly invalid: boolean;
  }) => React.ReactNode;
}

export function FieldChrome({
  label,
  hideLabel = false,
  helper,
  error,
  className,
  children,
}: FieldChromeProps): React.ReactElement {
  const id = useId();
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const invalid = Boolean(error);
  const describedBy =
    [error ? errorId : null, helper ? helperId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={id}
        className={clsx('text-[13px] font-medium text-secondary', hideLabel && 'sr-only')}
      >
        {label}
      </label>
      {children({ id, describedBy, invalid })}
      {error ? (
        <p id={errorId} className="text-[13px] text-danger">
          {error}
        </p>
      ) : helper ? (
        <p id={helperId} className="text-[13px] text-secondary">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

/** Shared control shell classes (surface.inset, border, radius.md — D2 §13.3). */
export function controlClass(invalid: boolean, extra?: string): string {
  return clsx(
    'w-full rounded-md border bg-inset text-sm text-primary transition-colors duration-[120ms]',
    'placeholder:text-secondary read-only:opacity-80 disabled:pointer-events-none disabled:opacity-50',
    invalid
      ? 'border-[color:var(--status-danger-fg)]'
      : 'border-border-default hover:border-border-strong',
    extra,
  );
}

export const CONTROL_HEIGHT = { sm: 'h-7', md: 'h-9', lg: 'h-11' } as const;
export type ControlSize = keyof typeof CONTROL_HEIGHT;
