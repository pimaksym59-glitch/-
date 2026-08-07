'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * NavLink — a Link with **prefetch on intent** (Stage 2 §9). Next's automatic
 * viewport prefetching is disabled and replaced by an explicit prefetch on
 * hover/focus, so we fetch what the user is about to open rather than every
 * link in the sidebar.
 */
export interface NavLinkProps extends Omit<React.ComponentProps<typeof Link>, 'prefetch'> {
  readonly href: string;
}

export function NavLink({
  href,
  onMouseEnter,
  onFocus,
  ...rest
}: NavLinkProps): React.ReactElement {
  const router = useRouter();

  const prefetch = useCallback(() => {
    router.prefetch(href);
  }, [router, href]);

  return (
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={(event) => {
        prefetch();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        prefetch();
        onFocus?.(event);
      }}
      {...rest}
    />
  );
}
