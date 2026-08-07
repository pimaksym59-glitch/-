'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

/**
 * Sheet / Drawer (D2 §13.10 · Overlay elevation + glass + scrim).
 * Radix Dialog provides the focus trap, `esc` handling and focus restore.
 * **FS2 scope:** mobile navigation + the mobile Inspector. Formalized in FS3.
 */
export type SheetSide = 'left' | 'right' | 'bottom';

export interface SheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly side?: SheetSide;
  readonly title: string;
  /** Hide the visible title but keep it for screen readers. */
  readonly hideTitle?: boolean;
  readonly description?: string;
  readonly children: React.ReactNode;
}

const SIDE_CLASS: Record<SheetSide, string> = {
  left: 'inset-y-0 left-0 h-full w-[min(320px,88vw)] rounded-r-2xl',
  right: 'inset-y-0 right-0 h-full w-[min(420px,92vw)] rounded-l-2xl',
  bottom: 'inset-x-0 bottom-0 max-h-[85dvh] w-full rounded-t-2xl',
};

export function Sheet({
  open,
  onOpenChange,
  side = 'left',
  title,
  hideTitle = false,
  description,
  children,
}: SheetProps): React.ReactElement {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="onyx-scrim fixed inset-0 z-[var(--z-drawer)]" />
        <Dialog.Content
          className={clsx(
            'onyx-overlay fixed z-[var(--z-drawer)] flex flex-col overflow-hidden',
            SIDE_CLASS[side],
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
            {hideTitle ? (
              <Dialog.Title className="sr-only">{title}</Dialog.Title>
            ) : (
              <Dialog.Title className="text-sm font-semibold text-primary">{title}</Dialog.Title>
            )}
            <Dialog.Close
              aria-label="Close"
              className="inline-flex size-8 items-center justify-center rounded-md text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary"
            >
              <X aria-hidden className="size-4" />
            </Dialog.Close>
          </div>
          {/* Always described: Radix requires an accessible description, and a
              panel without one is an a11y gap rather than a warning to silence. */}
          <Dialog.Description className="sr-only">
            {description ?? `${title} panel`}
          </Dialog.Description>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
