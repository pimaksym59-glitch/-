'use client';

import { clsx } from 'clsx';
import { CONTROL_HEIGHT, type ControlSize, FieldChrome, controlClass } from '../field/Field';

/**
 * Input (D2 §13.3). Anatomy: label · [leading icon] value [trailing slot] ·
 * helper/error. States: default/focus/invalid/disabled/readonly/filled.
 * The label is required (visible or sr-only) — a11y is part of the component.
 */
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'id'> {
  /** React 19 ref-as-prop — forwarded to the native input (form libraries). */
  readonly ref?: React.Ref<HTMLInputElement>;
  readonly label: string;
  readonly hideLabel?: boolean;
  readonly helper?: string;
  readonly error?: string;
  readonly leading?: React.ReactNode;
  readonly trailing?: React.ReactNode;
  readonly size?: ControlSize;
  readonly containerClassName?: string;
}

export function Input({
  label,
  hideLabel,
  helper,
  error,
  leading,
  trailing,
  size = 'md',
  containerClassName,
  className,
  ...rest
}: InputProps): React.ReactElement {
  return (
    <FieldChrome
      label={label}
      {...(hideLabel !== undefined ? { hideLabel } : {})}
      {...(helper !== undefined ? { helper } : {})}
      {...(error !== undefined ? { error } : {})}
      {...(containerClassName !== undefined ? { className: containerClassName } : {})}
    >
      {({ id, describedBy, invalid }) => (
        <div className={clsx('relative flex items-center')}>
          {leading ? (
            <span aria-hidden className="pointer-events-none absolute left-3 text-secondary">
              {leading}
            </span>
          ) : null}
          <input
            id={id}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            data-invalid={invalid || undefined}
            className={clsx(
              controlClass(invalid),
              CONTROL_HEIGHT[size],
              'px-3',
              leading && 'pl-9',
              trailing && 'pr-9',
              className,
            )}
            {...rest}
          />
          {trailing ? <span className="absolute right-2 text-secondary">{trailing}</span> : null}
        </div>
      )}
    </FieldChrome>
  );
}
