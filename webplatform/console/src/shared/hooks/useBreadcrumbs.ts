'use client';

/**
 * Derives breadcrumbs from the route registry + current pathname (D1 §6.6).
 * Never exceeds three crumbs — deeper context belongs in the Inspector.
 */
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { ROUTE_LIST } from '@/shared/config/routes';
import type { Crumb } from '@/shared/ui/breadcrumbs';

const GROUP_LABEL: Record<string, string> = {
  workspace: 'Workspace',
  platform: 'Platform',
  account: 'Account',
  public: 'Console',
};

export function useBreadcrumbs(): readonly Crumb[] {
  const pathname = usePathname();

  return useMemo(() => {
    const match = ROUTE_LIST.filter(
      (r) => r.path !== '/' && (pathname === r.path || pathname.startsWith(`${r.path}/`)),
    ).sort((a, b) => b.path.length - a.path.length)[0];

    if (!match) return [];

    const crumbs: Crumb[] = [
      { label: GROUP_LABEL[match.group] ?? 'Console' },
      { label: match.label },
    ];

    // A deeper segment (e.g. /knowledge/<docId>) adds one final crumb.
    const rest = pathname.slice(match.path.length).replace(/^\//, '');
    if (rest.length > 0) {
      const [segment] = rest.split('/');
      if (segment) crumbs.push({ label: decodeURIComponent(segment) });
    }

    return crumbs;
  }, [pathname]);
}
