'use client';

import * as RadixSelect from '@radix-ui/react-select';
import { clsx } from 'clsx';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { CONTROL_HEIGHT, type ControlSize, FieldChrome, controlClass } from '../field/Field';

/**
 * Select (D2 §13.4). Trigger styled like an input + chevron; Floating menu with
 * keyboard navigation, type-ahead and announced selection (Radix). The async
 * variant shows an inline loading row.
 */
export interface SelectItem {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface SelectProps {
  readonly label: string;
  readonly hideLabel?: boolean;
  readonly helper?: string;
  readonly error?: string;
  readonly items: readonly SelectItem[];
  readonly value?: string;
  readonly onValueChange?: (value: string) => void;
  readonly placeholder?: string;
  readonly size?: ControlSize;
  readonly disabled?: boolean;
  /** Async variant: shows an inline loading row instead of items. */
  readonly loading?: boolean;
  readonly className?: string;
}

export function Select({
  label,
  hideLabel,
  helper,
  error,
  items,
  value,
  onValueChange,
  placeholder = 'Select…',
  size = 'md',
  disabled,
  loading = false,
  className,
}: SelectProps): React.ReactElement {
  return (
    <FieldChrome
      label={label}
      {...(hideLabel !== undefined ? { hideLabel } : {})}
      {...(helper !== undefined ? { helper } : {})}
      {...(error !== undefined ? { error } : {})}
      {...(className !== undefined ? { className } : {})}
    >
      {({ id, describedBy, invalid }) => (
        <RadixSelect.Root
          {...(value !== undefined ? { value } : {})}
          {...(onValueChange ? { onValueChange } : {})}
          {...(disabled !== undefined ? { disabled } : {})}
        >
          <RadixSelect.Trigger
            id={id}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            data-invalid={invalid || undefined}
            className={clsx(
              controlClass(invalid),
              CONTROL_HEIGHT[size],
              'inline-flex items-center justify-between gap-2 px-3 text-left',
              'data-[placeholder]:text-secondary',
            )}
          >
            <RadixSelect.Value placeholder={placeholder} />
            <RadixSelect.Icon>
              <ChevronDown aria-hidden className="size-4 text-secondary" strokeWidth={1.5} />
            </RadixSelect.Icon>
          </RadixSelect.Trigger>
          <RadixSelect.Portal>
            <RadixSelect.Content
              position="popper"
              sideOffset={6}
              className="onyx-floating z-[var(--z-overlay)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg p-1"
            >
              <RadixSelect.Viewport>
                {loading ? (
                  <div
                    role="status"
                    className="flex items-center gap-2 px-2.5 py-2 text-sm text-secondary"
                  >
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                    Loading options…
                  </div>
                ) : (
                  items.map((item) => (
                    <RadixSelect.Item
                      key={item.value}
                      value={item.value}
                      disabled={item.disabled ?? false}
                      className={clsx(
                        'flex cursor-default select-none items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-sm text-primary outline-none',
                        'data-[highlighted]:bg-interactive-subtle data-[disabled]:opacity-50',
                      )}
                    >
                      <RadixSelect.ItemText>{item.label}</RadixSelect.ItemText>
                      <RadixSelect.ItemIndicator>
                        <Check
                          aria-hidden
                          className="size-4 text-[color:var(--interactive-default)]"
                        />
                      </RadixSelect.ItemIndicator>
                    </RadixSelect.Item>
                  ))
                )}
              </RadixSelect.Viewport>
            </RadixSelect.Content>
          </RadixSelect.Portal>
        </RadixSelect.Root>
      )}
    </FieldChrome>
  );
}
