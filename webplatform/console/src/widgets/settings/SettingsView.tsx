'use client';

/**
 * SettingsView (FS13 T-FS13.4 — D3 §23).
 *
 * Shape: a section nav plus one panel. The section lives in the PATH
 * (`/settings/<section>`), so every view is a shareable link that Back reverses
 * — a section is a place, which is the FS8 lesson about `push` vs `replace`.
 *
 * Only Appearance is eager. The other five panels arrive through a SINGLE
 * `dynamic()` boundary (see `SecondaryPanels`) because every `dynamic()`
 * anywhere adds an entry to the webpack runtime chunk-id map that lives in
 * commons, and `/chat` has no headroom left to pay for five of them.
 *
 * The nav is real navigation (`Link`), which also keeps this screen clear of
 * the `scrollable-region-focusable` violation axe found on FS12's seam pages:
 * a scrollable main region needs something focusable inside it.
 */
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAccountPreferences } from '@/features/change-settings';
import { useSession } from '@/shared/providers';
import { Skeleton } from '@/shared/ui/skeleton';
import { AppearancePanel } from './AppearancePanel';
import { SECTION_LABEL, SETTINGS_SECTIONS, type SettingsSection } from './sections';

const SecondaryPanels = dynamic(
  () => import('./SecondaryPanels').then((m) => ({ default: m.SecondaryPanelSwitch })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-xl" /> },
);

export function SettingsView({
  section,
}: {
  readonly section: SettingsSection;
}): React.ReactElement {
  const api = useAccountPreferences();
  const session = useSession();
  const level = api.preferences.experience;
  const advanced = level === 'advanced' || level === 'power';
  const power = level === 'power';

  return (
    <section className="mx-auto flex w-full max-w-[980px] flex-col gap-6 px-6 py-8 md:px-8">
      <header>
        <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.015em] text-primary">
          Settings
        </h1>
        <p className="mt-1 max-w-[72ch] text-sm text-secondary">
          How this console looks and behaves for you. Changes apply immediately — there is no save
          button, because there is nothing to send.
        </p>
      </header>

      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        <nav
          aria-label="Settings sections"
          className="flex shrink-0 gap-1 overflow-x-auto md:w-[176px] md:flex-col md:overflow-visible"
        >
          {SETTINGS_SECTIONS.map((item) => {
            const current = item === section;
            return (
              <Link
                key={item}
                href={item === 'appearance' ? '/settings' : `/settings/${item}`}
                aria-current={current ? 'page' : undefined}
                className={[
                  'whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2',
                  current
                    ? 'bg-interactive-subtle font-medium text-primary'
                    : 'text-secondary hover:bg-interactive-subtle hover:text-primary',
                ].join(' ')}
              >
                {SECTION_LABEL[item]}
              </Link>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1">
          {section === 'appearance' ? (
            <AppearancePanel advanced={advanced} />
          ) : (
            <SecondaryPanels
              section={section}
              api={api}
              advanced={advanced}
              power={power}
              isOwner={session?.role === 'owner'}
            />
          )}
        </div>
      </div>
    </section>
  );
}
