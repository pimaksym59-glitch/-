'use client';

import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import { clsx } from 'clsx';
import { useId } from 'react';

/**
 * RadioGroup (D2 §13). Exclusive choice with roving focus (Radix).
 */
export interface RadioItem {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface RadioGroupProps {
  readonly label: string;
  readonly hideLabel?: boolean;
  readonly items: readonly RadioItem[];
  readonly value?: string;
  readonly onValueChange?: (value: string) => void;
  readonly disabled?: boolean;
  readonly orientation?: 'vertical' | 'horizontal';
  readonly className?: string;
}

export function RadioGroup({
  label,
  hideLabel = false,
  items,
  value,
  onValueChange,
  disabled,
  orientation = 'vertical',
  className,
}: RadioGroupProps): React.ReactElement {
  const labelId = useId();
  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      <span
        id={labelId}
        className={clsx('text-[13px] font-medium text-secondary', hideLabel && 'sr-only')}
      >
        {label}
      </span>
      <RadixRadioGroup.Root
        aria-labelledby={labelId}
        {...(value !== undefined ? { value } : {})}
        {...(onValueChange ? { onValueChange } : {})}
        {...(disabled !== undefined ? { disabled } : {})}
        orientation={orientation}
        className={clsx(
          'flex gap-3',
          orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
        )}
      >
        {items.map((item) => {
          const itemId = `${labelId}-${item.value}`;
          return (
            <span key={item.value} className="inline-flex items-center gap-2">
              <RadixRadioGroup.Item
                id={itemId}
                value={item.value}
                disabled={item.disabled ?? false}
                className={clsx(
                  'inline-flex size-4 shrink-0 items-center justify-center rounded-pill border border-border-strong bg-inset transition-colors duration-[120ms]',
                  'data-[state=checked]:border-[color:var(--interactive-default)]',
                  'disabled:pointer-events-none disabled:opacity-50',
                )}
              >
                <RadixRadioGroup.Indicator className="size-2 rounded-pill bg-interactive" />
              </RadixRadioGroup.Item>
              <label htmlFor={itemId} className="text-sm text-primary">
                {item.label}
              </label>
            </span>
          );
        })}
      </RadixRadioGroup.Root>
    </div>
  );
}
