import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

/**
 * Button (D2 §13.1). Variants: primary / secondary / ghost / danger / ai.
 * The `ai` variant carries the Aurora 1px edge (AI moments only, D2 §14) — it
 * must never be used for non-AI actions. Styled with ONYX semantic tokens via
 * Tailwind utilities (no raw hex, §F3.1).
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ai';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly loading?: boolean;
}

const VARIANT: Record<ButtonVariant, string> = {
  // Usage note (FS4, axe-found): `interactive.hover` in DARK is 3.63:1 against
  // `text.onAccent` at button sizes (<18px) — below AA. The hover tint
  // therefore uses `interactive.active` (AA in both themes); press feedback is
  // the D2 §13.1 scale (80ms, .98), reduced-motion safe. Token VALUES are
  // untouched; `interactive.hover` remains valid for large text/non-text uses.
  primary:
    'bg-interactive text-on-accent hover:bg-interactive-active active:bg-interactive-active active:scale-[.98] motion-reduce:active:scale-100',
  secondary: 'bg-raised text-primary border border-border-default hover:border-border-strong',
  ghost: 'text-primary hover:bg-interactive-subtle',
  danger:
    'text-danger border border-[color:var(--status-danger-fg)] hover:bg-danger-bg active:bg-danger-bg',
  ai: 'onyx-aurora-edge onyx-ai-wash text-primary hover:brightness-110',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-7 px-3 text-[13px]',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps): React.ReactElement {
  return (
    <button
      type={type}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      className={clsx(
        'inline-flex select-none items-center justify-center gap-2 rounded-md font-medium',
        'transition-[background-color,border-color,filter] duration-[120ms] ease-[var(--ease-standard)]',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
