'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { Button } from '../button';

/**
 * Dialog / Modal (D2 §13.10). Modal elevation, radius.2xl, max-width
 * 480 (confirm) / 640 (form) / 960 (rich); scrim, focus-trap, `esc`, focus
 * returns to trigger (Radix). The destructive variant separates the danger
 * action from the safe ones.
 */
export type DialogWidth = 'confirm' | 'form' | 'rich';

const WIDTH: Record<DialogWidth, string> = {
  confirm: 'max-w-[480px]',
  form: 'max-w-[640px]',
  rich: 'max-w-[960px]',
};

export interface DialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description?: string;
  readonly width?: DialogWidth;
  readonly children?: React.ReactNode;
  /** Footer actions. Use `destructive` to separate a danger action. */
  readonly primaryAction?: React.ReactNode;
  readonly secondaryAction?: React.ReactNode;
  readonly destructive?: boolean;
  readonly className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  width = 'confirm',
  children,
  primaryAction,
  secondaryAction,
  destructive = false,
  className,
}: DialogProps): React.ReactElement {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="onyx-scrim fixed inset-0 z-[var(--z-modal)]" />
        <RadixDialog.Content
          data-destructive={destructive || undefined}
          className={clsx(
            'onyx-modal fixed left-1/2 top-1/2 z-[var(--z-modal)] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6',
            WIDTH[width],
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <RadixDialog.Title className="text-base font-semibold text-primary">
              {title}
            </RadixDialog.Title>
            <RadixDialog.Close
              aria-label="Close"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary"
            >
              <X aria-hidden className="size-4" />
            </RadixDialog.Close>
          </div>
          {description ? (
            <RadixDialog.Description className="mt-1 text-sm text-secondary">
              {description}
            </RadixDialog.Description>
          ) : (
            <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
          )}
          {children ? <div className="mt-4">{children}</div> : null}
          {(primaryAction ?? secondaryAction) ? (
            <div
              className={clsx(
                'mt-6 flex items-center gap-2',
                destructive ? 'justify-between' : 'justify-end',
              )}
            >
              {destructive ? (
                <>
                  <div>{primaryAction}</div>
                  <div>{secondaryAction}</div>
                </>
              ) : (
                <>
                  {secondaryAction}
                  {primaryAction}
                </>
              )}
            </div>
          ) : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/** Canonical confirm-dialog composition (D2 §13.10 confirm width). */
export interface ConfirmDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description?: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly destructive?: boolean;
  readonly onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
}: ConfirmDialogProps): React.ReactElement {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      {...(description !== undefined ? { description } : {})}
      destructive={destructive}
      primaryAction={
        <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      }
      secondaryAction={
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          {cancelLabel}
        </Button>
      }
    />
  );
}
