'use client';

import * as Popover from '@radix-ui/react-popover';
import { clsx } from 'clsx';
import { Command } from 'cmdk';
import { Check, ChevronDown, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { CONTROL_HEIGHT, type ControlSize, FieldChrome, controlClass } from '../field/Field';

/**
 * Combobox (D2 §13.4 searchable/multi variant). Popover + cmdk listbox with
 * type-ahead filtering; multi-select renders removable chips in the trigger.
 */
export interface ComboboxItem {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface ComboboxProps {
  readonly label: string;
  readonly hideLabel?: boolean;
  readonly helper?: string;
  readonly error?: string;
  readonly items: readonly ComboboxItem[];
  /** Selected values — one entry for single mode, many for `multiple`. */
  readonly values: readonly string[];
  readonly onValuesChange: (values: readonly string[]) => void;
  readonly multiple?: boolean;
  readonly placeholder?: string;
  readonly size?: ControlSize;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly emptyText?: string;
  readonly className?: string;
}

export function Combobox({
  label,
  hideLabel,
  helper,
  error,
  items,
  values,
  onValuesChange,
  multiple = false,
  placeholder = 'Search…',
  size = 'md',
  disabled = false,
  loading = false,
  emptyText = 'No results.',
  className,
}: ComboboxProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const selected = items.filter((i) => values.includes(i.value));

  function toggle(value: string): void {
    if (multiple) {
      onValuesChange(
        values.includes(value) ? values.filter((v) => v !== value) : [...values, value],
      );
    } else {
      onValuesChange([value]);
      setOpen(false);
    }
  }

  return (
    <FieldChrome
      label={label}
      {...(hideLabel !== undefined ? { hideLabel } : {})}
      {...(helper !== undefined ? { helper } : {})}
      {...(error !== undefined ? { error } : {})}
      {...(className !== undefined ? { className } : {})}
    >
      {({ id, describedBy, invalid }) => (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger
            id={id}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            data-invalid={invalid || undefined}
            className={clsx(
              controlClass(invalid),
              multiple && selected.length > 0 ? 'min-h-9 py-1' : CONTROL_HEIGHT[size],
              'inline-flex flex-wrap items-center gap-1 px-3 text-left',
            )}
          >
            {selected.length === 0 ? (
              <span className="text-secondary">{placeholder}</span>
            ) : multiple ? (
              selected.map((item) => (
                <span
                  key={item.value}
                  className="inline-flex items-center gap-1 rounded-sm bg-interactive-subtle px-1.5 py-0.5 text-[13px] text-primary"
                >
                  {item.label}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${item.label}`}
                    className="inline-flex rounded-xs hover:text-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(item.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        toggle(item.value);
                      }
                    }}
                  >
                    <X aria-hidden className="size-3" />
                  </span>
                </span>
              ))
            ) : (
              <span>{selected[0]?.label}</span>
            )}
            <ChevronDown
              aria-hidden
              className="ml-auto size-4 shrink-0 text-secondary"
              strokeWidth={1.5}
            />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="start"
              sideOffset={6}
              className="onyx-floating z-[var(--z-overlay)] w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-lg"
            >
              <Command label={label}>
                <Command.Input
                  placeholder={placeholder}
                  className="w-full border-b border-border-subtle bg-transparent px-3 py-2 text-sm text-primary outline-none placeholder:text-secondary"
                />
                <Command.List className="max-h-64 overflow-y-auto p-1">
                  {loading ? (
                    <div
                      role="status"
                      className="flex items-center gap-2 px-2.5 py-2 text-sm text-secondary"
                    >
                      <Loader2 aria-hidden className="size-4 animate-spin" />
                      Loading…
                    </div>
                  ) : (
                    <>
                      <Command.Empty className="px-2.5 py-2 text-sm text-secondary">
                        {emptyText}
                      </Command.Empty>
                      {items.map((item) => (
                        <Command.Item
                          key={item.value}
                          value={item.label}
                          disabled={item.disabled ?? false}
                          onSelect={() => toggle(item.value)}
                          className={clsx(
                            'flex cursor-default select-none items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-sm text-primary',
                            'data-[selected=true]:bg-interactive-subtle data-[disabled=true]:opacity-50',
                          )}
                        >
                          {item.label}
                          {values.includes(item.value) ? (
                            <Check
                              aria-hidden
                              className="size-4 text-[color:var(--interactive-default)]"
                            />
                          ) : null}
                        </Command.Item>
                      ))}
                    </>
                  )}
                </Command.List>
              </Command>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </FieldChrome>
  );
}
