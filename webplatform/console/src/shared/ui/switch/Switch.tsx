'use client';

import * as RadixSwitch from '@radix-ui/react-switch';
import { clsx } from 'clsx';
import { useId } from 'react';

/**
 * Switch (D2 §13). An on/off toggle with a required label.
 */
export interface SwitchProps {
  readonly label: string;
  readonly hideLabel?: boolean;
  readonly checked?: boolean;
  readonly onCheckedChange?: (checked: boolean) => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

export function Switch({
  label,
  hideLabel = false,
  checked,
  onCheckedChange,
  disabled,
  className,
}: SwitchProps): React.ReactElement {
  const id = useId();
  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      <RadixSwitch.Root
        id={id}
        {...(checked !== undefined ? { checked } : {})}
        {...(onCheckedChange ? { onCheckedChange } : {})}
        {...(disabled !== undefined ? { disabled } : {})}
        className={clsx(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-pill border border-border-default bg-inset transition-colors duration-[120ms]',
          'data-[state=checked]:border-[color:var(--interactive-default)] data-[state=checked]:bg-interactive',
          'disabled:pointer-events-none disabled:opacity-50',
        )}
      >
        <RadixSwitch.Thumb
          className={clsx(
            'block size-3.5 translate-x-1 rounded-pill bg-[color:var(--text-secondary)] transition-transform duration-[120ms]',
            'data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-[color:var(--text-on-accent)]',
          )}
        />
      </RadixSwitch.Root>
      <label htmlFor={id} className={clsx('text-sm text-primary', hideLabel && 'sr-only')}>
        {label}
      </label>
    </span>
  );
}
