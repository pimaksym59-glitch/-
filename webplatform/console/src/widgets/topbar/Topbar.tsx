'use client';

/**
 * Topbar (D2 §13.8 / D1 §6.3). 56px, glass. Left: channel switcher +
 * breadcrumb context. Right: ⌘K search entry, notifications bell, avatar menu.
 * Everything else lives in the palette — the topbar stays minimal.
 */
import { Bell, Search } from 'lucide-react';
import { ROUTES } from '@/shared/config/routes';
import { useBreadcrumbs } from '@/shared/hooks';
import { useCommandPalette } from '@/shared/providers';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { Kbd } from '@/shared/ui/kbd';
import { NavLink } from '@/shared/ui/nav-link';
import { AvatarMenu } from './AvatarMenu';
import { ChannelSwitcher } from './ChannelSwitcher';

export function Topbar(): React.ReactElement {
  const { openPaletteWith } = useCommandPalette();
  const crumbs = useBreadcrumbs();

  return (
    <header className="onyx-glass sticky top-0 z-[var(--z-topbar)] flex h-14 shrink-0 items-center justify-between gap-3 px-3 md:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <ChannelSwitcher />
        <span aria-hidden className="hidden h-5 w-px bg-[color:var(--border-default)] sm:block" />
        <Breadcrumbs items={crumbs} className="hidden sm:block" />
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {/* D1 §6.7: search is folded into the palette (`#`) plus this
            persistent entry — since FS7 it opens the palette pre-set to `#`
            (real knowledge search; other entity types keep honest copy). */}
        <button
          type="button"
          onClick={() => openPaletteWith('#')}
          aria-label="Search entities"
          className="flex h-9 items-center gap-2 rounded-md border border-border-default bg-inset px-3 text-sm text-secondary transition-colors hover:border-border-strong"
        >
          <Search aria-hidden className="size-4" />
          <span className="hidden md:inline">Search…</span>
          <Kbd keys={['⌘', 'K']} className="hidden md:inline-flex" />
        </button>

        <NavLink
          href={ROUTES.notifications.path}
          aria-label="Notifications"
          className="inline-flex size-9 items-center justify-center rounded-md text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary"
        >
          <Bell aria-hidden className="size-5" />
        </NavLink>

        <AvatarMenu />
      </div>
    </header>
  );
}
