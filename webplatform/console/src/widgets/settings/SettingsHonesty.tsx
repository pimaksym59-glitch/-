/**
 * The one fact that governs the whole screen, rendered by the RSC page.
 *
 * It is a Server Component deliberately: static markup inside a `'use client'`
 * widget ships in that route's client bundle, and moving it to the server page
 * removes it entirely (the FS12 lesson that took `/jobs` from 183 to 172 kB).
 * It costs `/settings` nothing beyond the HTML it produces.
 */
export function SettingsHonesty(): React.ReactElement {
  return (
    <section className="mx-auto w-full max-w-[980px] px-6 pb-10 md:px-8">
      <div className="rounded-xl border border-border-subtle p-5">
        <h2 className="text-sm font-semibold text-primary">Where these settings live</h2>
        <p className="mt-2 max-w-[72ch] text-[13px] leading-6 text-secondary">
          The platform API carries no preferences resource, and the user record has no preferences
          column. Nothing on this screen is stored on your account: theme and density are cookies,
          the experience level and notification choices are local storage, and all four belong to
          this browser. Sign in somewhere else and you will get the defaults.
        </p>
        <p className="mt-2 max-w-[72ch] text-[13px] leading-6 text-secondary">
          That is a statement about the contract, not a limitation of this screen. If a preferences
          endpoint is ever added, these controls keep their shape and start syncing — the console
          reads and writes them through a single module for exactly that reason.
        </p>
      </div>
    </section>
  );
}
