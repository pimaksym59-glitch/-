'use client';

import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { clsx } from 'clsx';
import { ChevronRight } from 'lucide-react';
import { Kbd } from '../kbd';

/**
 * Menu / Dropdown (D2 §13.11). Floating elevation, radius.lg; item rows with
 * icon + label + shortcut + trailing state; overline section dividers;
 * destructive items in danger; submenu on hover/`→`. Radix supplies roving
 * focus, type-ahead and announcements. RBAC-aware call sites simply omit
 * forbidden items (SEC-7 — never rendered, not merely disabled).
 */
export interface MenuProps {
  readonly trigger: React.ReactNode;
  readonly label: string;
  readonly children: React.ReactNode;
  readonly align?: 'start' | 'center' | 'end';
  readonly className?: string;
}

export function Menu({
  trigger,
  label,
  children,
  align = 'end',
  className,
}: MenuProps): React.ReactElement {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild aria-label={label}>
        {trigger}
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          align={align}
          sideOffset={6}
          className={clsx('onyx-floating z-[var(--z-overlay)] min-w-52 rounded-lg p-1', className)}
        >
          {children}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}

export interface MenuItemProps {
  readonly icon?: React.ReactNode;
  readonly shortcut?: string;
  readonly destructive?: boolean;
  readonly disabled?: boolean;
  readonly onSelect?: () => void;
  readonly children: React.ReactNode;
}

export const menuItemClass = (destructive: boolean): string =>
  clsx(
    'flex cursor-default select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none',
    destructive
      ? 'text-danger data-[highlighted]:bg-danger-bg'
      : 'text-primary data-[highlighted]:bg-interactive-subtle',
    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  );

export function MenuItem({
  icon,
  shortcut,
  destructive = false,
  disabled = false,
  onSelect,
  children,
}: MenuItemProps): React.ReactElement {
  return (
    <Dropdown.Item
      disabled={disabled}
      {...(onSelect ? { onSelect } : {})}
      className={menuItemClass(destructive)}
    >
      {icon ? (
        <span aria-hidden className="inline-flex size-4 items-center justify-center">
          {icon}
        </span>
      ) : null}
      <span className="flex-1">{children}</span>
      {shortcut ? <Kbd keys={shortcut.split(' ')} /> : null}
    </Dropdown.Item>
  );
}

export function MenuSection({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <Dropdown.Group>
      <Dropdown.Label className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-secondary">
        {label}
      </Dropdown.Label>
      {children}
    </Dropdown.Group>
  );
}

export function MenuSeparator(): React.ReactElement {
  return <Dropdown.Separator className="my-1 h-px bg-[color:var(--border-subtle)]" />;
}

export interface MenuSubProps {
  readonly label: string;
  readonly icon?: React.ReactNode;
  readonly children: React.ReactNode;
}

export function MenuSub({ label, icon, children }: MenuSubProps): React.ReactElement {
  return (
    <Dropdown.Sub>
      <Dropdown.SubTrigger className={menuItemClass(false)}>
        {icon ? (
          <span aria-hidden className="inline-flex size-4 items-center justify-center">
            {icon}
          </span>
        ) : null}
        <span className="flex-1">{label}</span>
        <ChevronRight aria-hidden className="size-4 text-secondary" />
      </Dropdown.SubTrigger>
      <Dropdown.Portal>
        <Dropdown.SubContent
          sideOffset={4}
          className="onyx-floating z-[var(--z-overlay)] min-w-44 rounded-lg p-1"
        >
          {children}
        </Dropdown.SubContent>
      </Dropdown.Portal>
    </Dropdown.Sub>
  );
}
