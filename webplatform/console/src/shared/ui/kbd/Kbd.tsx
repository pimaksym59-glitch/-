import { clsx } from 'clsx';

/** Kbd (D2 §13) — a keyboard-shortcut hint chip. */
export interface KbdProps {
  readonly keys: readonly string[];
  readonly className?: string;
}

export function Kbd({ keys, className }: KbdProps): React.ReactElement {
  return (
    <kbd
      className={clsx(
        'inline-flex items-center gap-1 rounded-sm border border-border-default bg-inset px-1.5',
        'font-mono text-[11px] text-secondary',
        className,
      )}
    >
      {keys.map((k, i) => (
        <span key={`${k}-${i}`}>{k}</span>
      ))}
    </kbd>
  );
}
