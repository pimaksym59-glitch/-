'use client';

import * as RadixTabs from '@radix-ui/react-tabs';
import { clsx } from 'clsx';

/**
 * Tabs (D2 §13.6). Underline style — a 2px iris indicator under the active
 * tab; optional count badges. Radix provides tablist semantics + arrow keys.
 */
export interface TabItem {
  readonly value: string;
  readonly label: string;
  readonly count?: number;
  readonly disabled?: boolean;
}

export interface TabsProps {
  readonly label: string;
  readonly items: readonly TabItem[];
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string) => void;
  readonly children?: React.ReactNode;
  readonly className?: string;
}

export function Tabs({
  label,
  items,
  value,
  defaultValue,
  onValueChange,
  children,
  className,
}: TabsProps): React.ReactElement {
  return (
    <RadixTabs.Root
      {...(value !== undefined ? { value } : {})}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
      {...(onValueChange ? { onValueChange } : {})}
      className={className}
    >
      <RadixTabs.List
        aria-label={label}
        className="flex items-center gap-1 border-b border-border-subtle"
      >
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            disabled={item.disabled ?? false}
            className={clsx(
              'relative -mb-px inline-flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2 text-[13px] font-medium text-secondary transition-colors duration-[180ms]',
              'hover:text-primary disabled:pointer-events-none disabled:opacity-50',
              'data-[state=active]:border-[color:var(--interactive-default)] data-[state=active]:text-primary',
            )}
          >
            {item.label}
            {item.count !== undefined ? (
              <span className="rounded-pill bg-interactive-subtle px-1.5 text-xs tabular-nums text-secondary">
                {item.count}
              </span>
            ) : null}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children}
    </RadixTabs.Root>
  );
}

export interface TabPanelProps {
  readonly value: string;
  readonly children: React.ReactNode;
  readonly className?: string;
}

export function TabPanel({ value, children, className }: TabPanelProps): React.ReactElement {
  return (
    <RadixTabs.Content value={value} className={clsx('pt-4 outline-none', className)}>
      {children}
    </RadixTabs.Content>
  );
}
