'use client';

import * as RadixContextMenu from '@radix-ui/react-context-menu';
import { Kbd } from '../kbd';
import { menuItemClass } from '../menu/Menu';

/**
 * ContextMenu (D2 §13.13). Right-click menu with the same visual language as
 * Menus; contextual to a row/entity. Call sites must ALSO expose the actions
 * via a visible `⋯` Menu trigger — right-click is an accelerator, not the only
 * path (a11y). RBAC-forbidden actions are simply not rendered (SEC-7).
 */
export interface ContextMenuProps {
  readonly label: string;
  readonly children: React.ReactNode;
  readonly content: React.ReactNode;
}

export function ContextMenu({ label, children, content }: ContextMenuProps): React.ReactElement {
  return (
    <RadixContextMenu.Root>
      <RadixContextMenu.Trigger asChild aria-label={label}>
        {children}
      </RadixContextMenu.Trigger>
      <RadixContextMenu.Portal>
        <RadixContextMenu.Content className="onyx-floating z-[var(--z-overlay)] min-w-52 rounded-lg p-1">
          {content}
        </RadixContextMenu.Content>
      </RadixContextMenu.Portal>
    </RadixContextMenu.Root>
  );
}

export interface ContextMenuItemProps {
  readonly icon?: React.ReactNode;
  readonly shortcut?: string;
  readonly destructive?: boolean;
  readonly disabled?: boolean;
  readonly onSelect?: () => void;
  readonly children: React.ReactNode;
}

export function ContextMenuItem({
  icon,
  shortcut,
  destructive = false,
  disabled = false,
  onSelect,
  children,
}: ContextMenuItemProps): React.ReactElement {
  return (
    <RadixContextMenu.Item
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
    </RadixContextMenu.Item>
  );
}

export function ContextMenuSeparator(): React.ReactElement {
  return <RadixContextMenu.Separator className="my-1 h-px bg-[color:var(--border-subtle)]" />;
}
