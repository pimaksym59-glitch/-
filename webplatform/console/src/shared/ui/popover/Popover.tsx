'use client';

import * as RadixPopover from '@radix-ui/react-popover';
import { clsx } from 'clsx';

/**
 * Popover (D2 §13 Popover/Tooltip). Floating elevation, dismissable, focus
 * management by Radix. For rich anchored content — never for menus (Menu) or
 * ephemeral hints (Tooltip).
 */
export interface PopoverProps {
  readonly trigger: React.ReactNode;
  readonly children: React.ReactNode;
  readonly side?: 'top' | 'right' | 'bottom' | 'left';
  readonly align?: 'start' | 'center' | 'end';
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly className?: string;
}

export function Popover({
  trigger,
  children,
  side = 'bottom',
  align = 'center',
  open,
  onOpenChange,
  className,
}: PopoverProps): React.ReactElement {
  return (
    <RadixPopover.Root
      {...(open !== undefined ? { open } : {})}
      {...(onOpenChange ? { onOpenChange } : {})}
    >
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          side={side}
          align={align}
          sideOffset={8}
          className={clsx('onyx-floating z-[var(--z-overlay)] rounded-lg p-3', className)}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
