'use client';

import * as RadixScrollArea from '@radix-ui/react-scroll-area';
import { clsx } from 'clsx';

/**
 * ScrollArea (D2 §13 · token-styled scrollbars, keyboard-scrollable).
 * **FS2 scope:** sidebar and palette result lists. Formalized in FS3.
 */
export interface ScrollAreaProps {
  readonly children: React.ReactNode;
  readonly className?: string;
}

export function ScrollArea({ children, className }: ScrollAreaProps): React.ReactElement {
  return (
    <RadixScrollArea.Root className={clsx('overflow-hidden', className)} type="hover">
      <RadixScrollArea.Viewport className="size-full">{children}</RadixScrollArea.Viewport>
      <RadixScrollArea.Scrollbar
        orientation="vertical"
        className="flex w-2.5 touch-none select-none p-0.5"
      >
        <RadixScrollArea.Thumb className="flex-1 rounded-pill bg-[color:var(--border-strong)]" />
      </RadixScrollArea.Scrollbar>
      <RadixScrollArea.Corner />
    </RadixScrollArea.Root>
  );
}
