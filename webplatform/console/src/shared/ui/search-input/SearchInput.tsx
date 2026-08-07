'use client';

import { Search } from 'lucide-react';
import { Kbd } from '../kbd';
import { Input, type InputProps } from '../input/Input';

/**
 * SearchInput (D2 §13.3 search variant). Leading search icon; optional ⌘K hint
 * chip that documents the palette entry (D1 §6.4).
 */
export interface SearchInputProps extends Omit<InputProps, 'leading' | 'trailing' | 'type'> {
  readonly showPaletteHint?: boolean;
}

export function SearchInput({
  showPaletteHint = false,
  label,
  ...rest
}: SearchInputProps): React.ReactElement {
  return (
    <Input
      type="search"
      label={label}
      leading={<Search aria-hidden className="size-4" strokeWidth={1.5} />}
      {...(showPaletteHint ? { trailing: <Kbd keys={['⌘', 'K']} /> } : {})}
      {...rest}
    />
  );
}
