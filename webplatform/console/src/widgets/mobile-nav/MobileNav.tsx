'use client';

/**
 * Mobile navigation (D1 §10 / D2 §13.7). Below `md` the sidebar becomes a
 * bottom tab bar with the four primary destinations plus a "More" sheet holding
 * the full RBAC-filtered nav. Touch targets are ≥44px; nothing is desktop-only.
 */
import { clsx } from 'clsx';
import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ROUTES, ROUTE_LIST, type RouteDef, type RouteGroup } from '@/shared/config/routes';
import { useCan } from '@/shared/providers';
import { getIcon } from '@/shared/ui/icon';
import { NavLink } from '@/shared/ui/nav-link';
import { Sheet } from '@/shared/ui/sheet';

/** The four primary mobile destinations (D3 mobile pattern). */
const PRIMARY = [ROUTES.dashboard, ROUTES.chat, ROUTES.analytics, ROUTES.channels] as const;

const GROUPS: readonly { group: RouteGroup; label: string }[] = [
  { group: 'workspace', label: 'Workspace' },
  { group: 'platform', label: 'Platform' },
  { group: 'account', label: 'Account' },
];

function active(pathname: string, route: RouteDef): boolean {
  return pathname === route.path || pathname.startsWith(`${route.path}/`);
}

export function MobileNav(): React.ReactElement {
  const pathname = usePathname();
  const can = useCan();
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = PRIMARY.filter((r) => !r.permission || can(r.permission));

  return (
    <>
      <nav
        aria-label="Primary mobile"
        className="onyx-glass fixed inset-x-0 bottom-0 z-[var(--z-topbar)] flex h-16 items-stretch justify-around border-t border-border-subtle md:hidden"
      >
        {primary.map((route) => {
          const Icon = getIcon(route.icon);
          const isActive = active(pathname, route);
          return (
            <NavLink
              key={route.path}
              href={route.path}
              aria-current={isActive ? 'page' : undefined}
              className={clsx(
                'flex min-w-[44px] flex-1 flex-col items-center justify-center gap-1 text-[11px]',
                isActive ? 'text-primary' : 'text-secondary',
              )}
            >
              <Icon aria-hidden className="size-5" strokeWidth={1.5} />
              <span className="truncate px-1">{route.label}</span>
            </NavLink>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-label="More navigation"
          className="flex min-w-[44px] flex-1 flex-col items-center justify-center gap-1 text-[11px] text-secondary"
        >
          <Menu aria-hidden className="size-5" strokeWidth={1.5} />
          <span>More</span>
        </button>
      </nav>

      <Sheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        side="bottom"
        title="Navigation"
        description="All screens available to your role."
      >
        <div className="flex flex-col gap-4 pb-4">
          {GROUPS.map(({ group, label }) => {
            const items = ROUTE_LIST.filter(
              (r) => r.group === group && r.nav && (!r.permission || can(r.permission)),
            );
            if (items.length === 0) return null;
            return (
              <div key={group} className="flex flex-col gap-1">
                <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-secondary">
                  {label}
                </p>
                {items.map((route) => {
                  const Icon = getIcon(route.icon);
                  return (
                    <NavLink
                      key={route.path}
                      href={route.path}
                      onClick={() => setMoreOpen(false)}
                      aria-current={active(pathname, route) ? 'page' : undefined}
                      className="flex min-h-[44px] items-center gap-3 rounded-md px-3 text-sm text-secondary hover:bg-interactive-subtle hover:text-primary"
                    >
                      <Icon aria-hidden className="size-[18px]" strokeWidth={1.5} />
                      {route.label}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </div>
      </Sheet>
    </>
  );
}
