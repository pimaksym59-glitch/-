'use client';

import * as RadixTooltip from '@radix-ui/react-tooltip';
import { clsx } from 'clsx';

/**
 * Tooltip (D2 §13 Popover/Tooltip · Floating elevation). Formalized in FS3:
 * per-tooltip open delay and alignment; ephemeral hints only — never
 * interactive content (that is Popover's job).
 */
export interface TooltipProps {
  readonly content: React.ReactNode;
  readonly side?: 'top' | 'right' | 'bottom' | 'left';
  readonly align?: 'start' | 'center' | 'end';
  /** Open delay in ms (defaults to the shared provider delay). */
  readonly delayMs?: number;
  readonly children: React.ReactNode;
  /** Suppress the tooltip (e.g. when the sidebar is expanded and shows labels). */
  readonly disabled?: boolean;
}

export function Tooltip({
  content,
  side = 'right',
  align = 'center',
  delayMs,
  disabled = false,
  children,
}: TooltipProps): React.ReactElement {
  if (disabled) return <>{children}</>;
  return (
    <RadixTooltip.Root {...(delayMs !== undefined ? { delayDuration: delayMs } : {})}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          align={align}
          sideOffset={8}
          className={clsx(
            'onyx-floating z-[var(--z-overlay)] rounded-lg px-2.5 py-1.5 text-[13px] text-primary',
          )}
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

/** Provider required once near the root for tooltips to share timing state. */
export const TooltipProvider = RadixTooltip.Provider;
