'use client';

import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import { clsx } from 'clsx';

/**
 * SegmentedControl (Stage 3 §2). An exclusive choice rendered as segments —
 * radiogroup semantics (roving focus, arrow keys) with button-like visuals.
 */
export interface SegmentItem {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface SegmentedControlProps {
  readonly label: string;
  readonly items: readonly SegmentItem[];
  readonly value?: string;
  readonly onValueChange?: (value: string) => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

export function SegmentedControl({
  label,
  items,
  value,
  onValueChange,
  disabled,
  className,
}: SegmentedControlProps): React.ReactElement {
  return (
    <RadixRadioGroup.Root
      aria-label={label}
      {...(value !== undefined ? { value } : {})}
      {...(onValueChange ? { onValueChange } : {})}
      {...(disabled !== undefined ? { disabled } : {})}
      orientation="horizontal"
      className={clsx(
        'inline-flex items-center gap-0.5 rounded-md border border-border-default bg-inset p-0.5',
        className,
      )}
    >
      {items.map((item) => (
        <RadixRadioGroup.Item
          key={item.value}
          value={item.value}
          disabled={item.disabled ?? false}
          className={clsx(
            'rounded-sm px-2.5 py-1 text-[13px] font-medium text-secondary transition-colors duration-[120ms]',
            'hover:text-primary data-[state=checked]:bg-raised data-[state=checked]:text-primary data-[state=checked]:shadow-sm',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
        >
          {item.label}
        </RadixRadioGroup.Item>
      ))}
    </RadixRadioGroup.Root>
  );
}
