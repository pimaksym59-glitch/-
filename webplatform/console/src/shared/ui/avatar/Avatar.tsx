'use client';

import * as RadixAvatar from '@radix-ui/react-avatar';
import { clsx } from 'clsx';

/**
 * Avatar / AvatarGroup (D2 §13.22). Circle; image or deterministic-tint
 * initials (muted set, never neon); optional presence dot; stacked group with
 * "+N".
 */
export type AvatarSize = 20 | 24 | 32 | 40 | 64;

export interface AvatarProps {
  readonly name: string;
  readonly src?: string;
  readonly size?: AvatarSize;
  readonly presence?: 'online' | 'offline';
  /** Decorative when the name is rendered next to it. */
  readonly decorative?: boolean;
  readonly className?: string;
}

/** Deterministic muted tint from the viz ramp (never neon). */
function tintIndex(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return (h % 8) + 1;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

export function Avatar({
  name,
  src,
  size = 32,
  presence,
  decorative = false,
  className,
}: AvatarProps): React.ReactElement {
  const dim = { width: size, height: size };
  return (
    <span className={clsx('relative inline-flex shrink-0', className)} style={dim}>
      <RadixAvatar.Root
        className="inline-flex size-full select-none items-center justify-center overflow-hidden rounded-pill bg-inset align-middle"
        aria-hidden={decorative || undefined}
      >
        {src ? (
          <RadixAvatar.Image
            src={src}
            alt={decorative ? '' : name}
            className="size-full object-cover"
          />
        ) : null}
        <RadixAvatar.Fallback
          {...(decorative ? {} : { 'aria-label': name })}
          className="flex size-full items-center justify-center font-medium text-on-accent"
          style={{
            backgroundColor: `color-mix(in oklab, var(--viz-${tintIndex(name)}) 55%, var(--surface-inset))`,
            fontSize: Math.max(9, Math.round(size * 0.36)),
          }}
        >
          {initials(name)}
        </RadixAvatar.Fallback>
      </RadixAvatar.Root>
      {presence ? (
        <span
          role="img"
          aria-label={presence === 'online' ? `${name} is online` : `${name} is offline`}
          className={clsx(
            'absolute -bottom-0.5 -right-0.5 rounded-pill border-2 border-[color:var(--surface-base)]',
            presence === 'online' ? 'bg-success' : 'bg-[color:var(--text-disabled)]',
          )}
          style={{ width: Math.max(8, size / 4), height: Math.max(8, size / 4) }}
        />
      ) : null}
    </span>
  );
}

export interface AvatarGroupProps {
  readonly names: readonly string[];
  readonly size?: AvatarSize;
  readonly max?: number;
  readonly className?: string;
}

export function AvatarGroup({
  names,
  size = 24,
  max = 4,
  className,
}: AvatarGroupProps): React.ReactElement {
  const visible = names.slice(0, max);
  const rest = names.length - visible.length;
  return (
    <span className={clsx('inline-flex items-center', className)}>
      {visible.map((n, i) => (
        <span key={n} className={clsx(i > 0 && '-ml-1.5')}>
          <Avatar name={n} size={size} />
        </span>
      ))}
      {rest > 0 ? (
        <span
          className="-ml-1.5 inline-flex items-center justify-center rounded-pill bg-inset text-[11px] font-medium text-secondary ring-2 ring-[color:var(--surface-base)]"
          style={{ width: size, height: size }}
          aria-label={`${rest} more`}
        >
          +{rest}
        </span>
      ) : null}
    </span>
  );
}
