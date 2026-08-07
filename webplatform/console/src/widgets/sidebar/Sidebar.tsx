'use client';

/**
 * Sidebar (D2 §13.7 / D1 §6.2). Grouped nav (Workspace / Platform / Account),
 * active item = 2px Iris left-marker + `interactive.subtle` tint — never a
 * heavy fill. Collapsible to a 64px icon rail (`⌘\`), state persisted per user
 * via cookie and applied SSR (no layout jump). Items are RBAC-filtered
 * (UI reflection only — the backend enforces, §F7.2).
 */
import { clsx } from 'clsx';
import { usePathname } from 'next/navigation';
import { PanelLeftClose, PanelLeftOpen, Sparkles } from 'lucide-react';
import { ROUTE_LIST, type RouteDef, type RouteGroup } from '@/shared/config/routes';
import { useUiStore, selectSidebar } from '@/shared/lib/store';
import { useCan } from '@/shared/providers';
import { getIcon } from '@/shared/ui/icon';
import { NavLink } from '@/shared/ui/nav-link';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Tooltip, TooltipProvider } from '@/shared/ui/tooltip';

const GROUPS: readonly { group: RouteGroup; label: string }[] = [
  { group: 'workspace', label: 'Workspace' },
  { group: 'platform', label: 'Platform' },
  { group: 'account', label: 'Account' },
];

function isActive(pathname: string, route: RouteDef): boolean {
  return pathname === route.path || pathname.startsWith(`${route.path}/`);
}

export function Sidebar(): React.ReactElement {
  const pathname = usePathname();
  const can = useCan();
  const sidebar = useUiStore(selectSidebar);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const isRail = sidebar === 'rail';

  return (
    <TooltipProvider delayDuration={300}>
      <nav
        aria-label="Primary"
        data-state={sidebar}
        className={clsx(
          'flex h-full shrink-0 flex-col border-r border-border-subtle bg-surface transition-[width] duration-[180ms] ease-[var(--ease-standard)]',
          isRail ? 'w-16' : 'w-[264px]',
        )}
      >
        <div className={clsx('flex items-center gap-2 px-3 py-4', isRail && 'justify-center px-0')}>
          <span className="onyx-aurora-edge onyx-ai-wash inline-flex size-7 shrink-0 items-center justify-center rounded-md text-ai">
            <Sparkles aria-hidden className="size-4" />
          </span>
          {isRail ? null : <span className="font-semibold text-primary">Console</span>}
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className={clsx('flex flex-col gap-5 pb-4', isRail ? 'px-2' : 'px-3')}>
            {GROUPS.map(({ group, label }) => {
              const items = ROUTE_LIST.filter(
                (r) => r.group === group && r.nav && (!r.permission || can(r.permission)),
              );
              if (items.length === 0) return null;

              return (
                <div key={group} className="flex flex-col gap-1">
                  {isRail ? (
                    <span
                      aria-hidden
                      className="mx-auto my-1 h-px w-6 bg-[color:var(--border-default)]"
                    />
                  ) : (
                    <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-secondary">
                      {label}
                    </p>
                  )}

                  {items.map((route) => {
                    const Icon = getIcon(route.icon);
                    const active = isActive(pathname, route);
                    return (
                      <Tooltip key={route.path} content={route.label} disabled={!isRail}>
                        <NavLink
                          href={route.path}
                          aria-current={active ? 'page' : undefined}
                          className={clsx(
                            'relative flex items-center gap-3 rounded-md py-2 text-sm transition-colors duration-[120ms]',
                            isRail ? 'justify-center px-0' : 'px-3',
                            active
                              ? 'bg-interactive-subtle text-primary before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-pill before:bg-interactive before:content-[""]'
                              : 'text-secondary hover:bg-interactive-subtle hover:text-primary',
                          )}
                        >
                          <Icon aria-hidden className="size-[18px] shrink-0" strokeWidth={1.5} />
                          {isRail ? (
                            <span className="sr-only">{route.label}</span>
                          ) : (
                            <span className="truncate">{route.label}</span>
                          )}
                        </NavLink>
                      </Tooltip>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className={clsx('border-t border-border-subtle p-2', isRail && 'flex justify-center')}>
          <Tooltip content={isRail ? 'Expand sidebar' : 'Collapse sidebar'} disabled={!isRail}>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={isRail ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!isRail}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary"
            >
              {isRail ? (
                <PanelLeftOpen aria-hidden className="size-[18px]" />
              ) : (
                <>
                  <PanelLeftClose aria-hidden className="size-[18px]" />
                  <span className="text-sm">Collapse</span>
                </>
              )}
            </button>
          </Tooltip>
        </div>
      </nav>
    </TooltipProvider>
  );
}
