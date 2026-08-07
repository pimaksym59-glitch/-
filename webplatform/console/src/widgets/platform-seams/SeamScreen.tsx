/**
 * SeamScreen (FS12 T-FS12.13) — the shape of an honest absence.
 *
 * Three routes in the Platform group have **no contract call at all**: `/logs`,
 * `/flags` and `/notifications` (plan §5.2 D3/D4/D5). The project's rule since
 * FS7 is that such a surface states the truth instead of simulating one, and
 * the FS9 lesson adds that it must do so on **every viewport** — a seam that
 * only renders on a wide screen leaves mobile users with an unexplained void.
 *
 * Each screen therefore answers the same three questions in the same order:
 *   1. **What the backend has** — the honest half; there IS data behind some of
 *      these, it simply is not reachable through `/api/v1`.
 *   2. **Why the console shows nothing** — the specific missing call.
 *   3. **What would change it** — an optional future backend MINOR, recorded as
 *      RV, never a prerequisite (§F2.4).
 *
 * This is a Server Component: it has no state, no query and no interactivity,
 * so it costs its routes nothing beyond the shell.
 *
 * **The "where to look instead" links are load-bearing, not decoration.** axe
 * caught a real `scrollable-region-focusable` violation on these routes: a page
 * with zero focusable elements leaves the scrollable `#main-content` region
 * unreachable by keyboard. The fix belongs in the CONTENT, never in the shared
 * shell (the FS7 rule — an a11y defect caused by what a page renders is fixed
 * where the page renders it), and pointing at the screens that DO have the
 * nearest real data is what the reader needs anyway.
 */
import Link from 'next/link';
import { getIcon } from '@/shared/ui/icon';

export interface SeamSection {
  readonly heading: string;
  readonly body: string;
}

export function SeamScreen({
  title,
  icon,
  lead,
  sections,
  related,
  links,
}: {
  readonly title: string;
  readonly icon: string;
  readonly lead: string;
  readonly sections: readonly SeamSection[];
  readonly related?: string;
  /** Real navigation to the screens that carry the nearest real data. */
  readonly links?: readonly { readonly href: string; readonly label: string }[];
}): React.ReactElement {
  const Icon = getIcon(icon);
  return (
    <section className="mx-auto w-full max-w-[900px] px-6 py-8 md:px-8">
      <header className="mb-6 flex items-start gap-3">
        <span className="mt-1 rounded-lg border border-border-subtle bg-surface-raised p-2">
          <Icon aria-hidden className="size-5 text-secondary" strokeWidth={1.5} />
        </span>
        <div>
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.015em] text-primary">
            {title}
          </h1>
          <p className="mt-1 max-w-[68ch] text-sm text-secondary">{lead}</p>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        {sections.map((section) => (
          <article
            key={section.heading}
            className="onyx-raised rounded-xl border border-border-subtle p-5"
          >
            <h2 className="text-sm font-semibold text-primary">{section.heading}</h2>
            <p className="mt-2 max-w-[72ch] text-[13px] leading-6 text-secondary">{section.body}</p>
          </article>
        ))}
      </div>

      {related ? <p className="mt-6 max-w-[72ch] text-[13px] text-secondary">{related}</p> : null}

      {links && links.length > 0 ? (
        <nav aria-label="Where to look instead" className="mt-3 flex flex-wrap gap-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md border border-border-default px-3 py-1.5 text-[13px] text-primary hover:bg-interactive-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </section>
  );
}
