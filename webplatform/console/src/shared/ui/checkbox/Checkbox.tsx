'use client';

import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { clsx } from 'clsx';
import { Check, Minus } from 'lucide-react';
import { useId } from 'react';

/**
 * Checkbox (D2 §13). States: on/off/indeterminate/disabled. Labelled always.
 */
export interface CheckboxProps {
  readonly label: string;
  readonly hideLabel?: boolean;
  readonly checked?: boolean | 'indeterminate';
  readonly onCheckedChange?: (checked: boolean | 'indeterminate') => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

export function Checkbox({
  label,
  hideLabel = false,
  checked,
  onCheckedChange,
  disabled,
  className,
}: CheckboxProps): React.ReactElement {
  const id = useId();
  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      <RadixCheckbox.Root
        id={id}
        {...(checked !== undefined ? { checked } : {})}
        {...(onCheckedChange ? { onCheckedChange } : {})}
        {...(disabled !== undefined ? { disabled } : {})}
        className={clsx(
          'inline-flex size-4 shrink-0 items-center justify-center rounded-xs border transition-colors duration-[120ms]',
          'border-border-strong bg-inset',
          'data-[state=checked]:border-[color:var(--interactive-default)] data-[state=checked]:bg-interactive data-[state=checked]:text-on-accent',
          'data-[state=indeterminate]:border-[color:var(--interactive-default)] data-[state=indeterminate]:bg-interactive data-[state=indeterminate]:text-on-accent',
          'disabled:pointer-events-none disabled:opacity-50',
        )}
      >
        <RadixCheckbox.Indicator>
          {checked === 'indeterminate' ? (
            <Minus aria-hidden className="size-3" strokeWidth={3} />
          ) : (
            <Check aria-hidden className="size-3" strokeWidth={3} />
          )}
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      <label htmlFor={id} className={clsx('text-sm text-primary', hideLabel && 'sr-only')}>
        {label}
      </label>
    </span>
  );
}
