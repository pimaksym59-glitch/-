'use client';

import { clsx } from 'clsx';
import { FieldChrome, controlClass } from '../field/Field';

/**
 * Textarea (D2 §13.3). Same field chrome as Input; vertical resize only.
 */
export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  readonly label: string;
  readonly hideLabel?: boolean;
  readonly helper?: string;
  readonly error?: string;
  readonly containerClassName?: string;
}

export function Textarea({
  label,
  hideLabel,
  helper,
  error,
  containerClassName,
  className,
  rows = 3,
  ...rest
}: TextareaProps): React.ReactElement {
  return (
    <FieldChrome
      label={label}
      {...(hideLabel !== undefined ? { hideLabel } : {})}
      {...(helper !== undefined ? { helper } : {})}
      {...(error !== undefined ? { error } : {})}
      {...(containerClassName !== undefined ? { className: containerClassName } : {})}
    >
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          rows={rows}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          data-invalid={invalid || undefined}
          className={clsx(controlClass(invalid), 'resize-y px-3 py-2', className)}
          {...rest}
        />
      )}
    </FieldChrome>
  );
}
