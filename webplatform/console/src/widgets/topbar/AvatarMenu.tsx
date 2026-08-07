'use client';

/**
 * Avatar menu (D1 §6.3): profile, theme, density, settings, sign out.
 * FS4: sign-out is the real feature-`auth` logout (BFF → contract
 * POST /auth/logout; clears the whole query cache).
 */
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useRouter } from 'next/navigation';
import { LogOut, Monitor, Settings, Sun, User } from 'lucide-react';
import { useLogout } from '@/features/auth';
import { ROUTES } from '@/shared/config/routes';
import { useSession, useTheme } from '@/shared/providers';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

const ITEM_CLASS =
  'flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-secondary outline-none data-[highlighted]:bg-interactive-subtle data-[highlighted]:text-primary';

export function AvatarMenu(): React.ReactElement {
  const session = useSession();
  const router = useRouter();
  const { logout } = useLogout();
  const { theme, toggleTheme, density, toggleDensity } = useTheme();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={session ? `Account menu for ${session.displayName}` : 'Account menu'}
          className="inline-flex size-8 items-center justify-center rounded-pill bg-interactive-subtle text-xs font-semibold text-primary transition-colors hover:bg-interactive-subtle"
        >
          {session ? initials(session.displayName) : '—'}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="onyx-floating z-[var(--z-overlay)] w-56 rounded-lg p-1.5"
        >
          {session ? (
            <>
              <div className="px-2 py-1.5">
                <p className="truncate text-sm font-medium text-primary">{session.displayName}</p>
                <p className="truncate text-[13px] text-secondary">{session.email}</p>
                {/* FS14 T-FS14.13: 11px is small text, and `text.tertiary` on
                    the overlay surface measures 3.6:1 in the dark theme (AA
                    needs 4.5:1). Fixed the way this project has fixed it five
                    times before — by changing WHICH token the call site uses,
                    never the token value. axe had never scanned it because the
                    menu must be OPENED first; the journey suite now opens it. */}
                <p className="mt-1 text-[11px] uppercase tracking-wider text-secondary">
                  {session.role}
                </p>
              </div>
              <DropdownMenu.Separator className="my-1 h-px bg-[color:var(--border-subtle)]" />
            </>
          ) : null}

          <DropdownMenu.Item
            className={ITEM_CLASS}
            onSelect={() => router.push(ROUTES.profile.path)}
          >
            <User aria-hidden className="size-4" /> Profile
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={ITEM_CLASS}
            onSelect={(event) => {
              event.preventDefault();
              toggleTheme();
            }}
          >
            <Sun aria-hidden className="size-4" />
            {theme === 'dark' ? 'Light theme' : 'Dark theme'}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={ITEM_CLASS}
            onSelect={(event) => {
              event.preventDefault();
              toggleDensity();
            }}
          >
            <Monitor aria-hidden className="size-4" />
            {density === 'comfortable' ? 'Compact density' : 'Comfortable density'}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={ITEM_CLASS}
            onSelect={() => router.push(ROUTES.settings.path)}
          >
            <Settings aria-hidden className="size-4" /> Settings
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-[color:var(--border-subtle)]" />
          <DropdownMenu.Item
            className={ITEM_CLASS}
            onSelect={() => {
              logout();
            }}
          >
            <LogOut aria-hidden className="size-4" /> Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
