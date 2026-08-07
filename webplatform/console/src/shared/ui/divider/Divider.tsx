import * as Separator from '@radix-ui/react-separator';
import { clsx } from 'clsx';

/**
 * Divider (Stage 3 §2). Hairline separator on border.subtle; optionally
 * decorative (default) or semantic.
 */
export interface DividerProps {
  readonly orientation?: 'horizontal' | 'vertical';
  readonly decorative?: boolean;
  readonly className?: string;
}

export function Divider({
  orientation = 'horizontal',
  decorative = true,
  className,
}: DividerProps): React.ReactElement {
  return (
    <Separator.Root
      orientation={orientation}
      decorative={decorative}
      className={clsx(
        'bg-[color:var(--border-subtle)]',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px self-stretch',
        className,
      )}
    />
  );
}
