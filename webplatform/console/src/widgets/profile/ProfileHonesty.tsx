/**
 * The Sessions tab, and the reason it is empty (FS13 — D3 §24).
 *
 * A Server Component: static markup inside a client widget ships in the route's
 * bundle, and this belongs on the server (the FS12 lesson). Rendered by the RSC
 * page and handed to the client view as a slot, so `/profile` pays nothing for
 * it beyond HTML.
 *
 * The links are load-bearing, not decoration — the FS12 a11y finding: a pane
 * with no focusable element leaves the scrollable main region unreachable by
 * keyboard, and the fix belongs in the CONTENT.
 */
import Link from 'next/link';

const LINK_CLASS =
  'inline-flex items-center rounded-md border border-border-default px-3 py-1.5 text-[13px] text-primary hover:bg-interactive-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2';

export function ProfileHonesty(): React.ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <article className="onyx-raised rounded-xl border border-border-subtle p-5">
        <h2 className="text-sm font-semibold text-primary">Your sessions cannot be listed</h2>
        <p className="mt-2 max-w-[72ch] text-[13px] leading-6 text-secondary">
          The platform can end sessions but cannot enumerate them: there is no session-inventory
          endpoint in the API and no sessions table in the schema. So there is no device list, no
          last-seen time and no current-session marker to show you — and inventing those rows would
          describe a system that does not exist.
        </p>
        <p className="mt-2 max-w-[72ch] text-[13px] leading-6 text-secondary">
          Revocation itself is real, but it is scoped to owners and takes a user id rather than
          acting on the caller, so it lives with the other governance actions in Admin.
        </p>
        <p className="mt-2 max-w-[72ch] text-[13px] leading-6 text-secondary">
          A session-inventory call would fill this tab with the list the design describes. That is
          optional future backend work — never a prerequisite for this console.
        </p>
        <nav aria-label="Where to look instead" className="mt-3 flex flex-wrap gap-3">
          <Link href="/admin?tab=sessions" className={LINK_CLASS}>
            Open Admin → Sessions
          </Link>
          <Link href="/settings/security" className={LINK_CLASS}>
            Open Security settings
          </Link>
        </nav>
      </article>
    </div>
  );
}
