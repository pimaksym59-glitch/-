'use client';

/**
 * Root error boundary (Stage 2 §11 names it; the console did not have one until
 * FS14 — Gate B of plan §1 T-FS14.1).
 *
 * It replaces the whole document when the root layout itself fails, so it may
 * not assume ANY provider: no theme context, no announcer, no toaster, no
 * query client. It therefore renders its own `<html>`/`<body>` with plain ONYX
 * token utilities and no `shared/ui` import — a component that needed a
 * provider here would fail inside the failure.
 *
 * **It reports nothing, and that is a measured decision, not an oversight.**
 * Gate A (plan §1 T-FS14.1) measured a client telemetry sink in two independent
 * placements — the three route-group boundaries, and this file alone. Both cost
 * `/billing` 144→145, `/dashboard` 168→169 and `/jobs` 172→173; control build C
 * (sink removed, server half kept) returned every route to baseline with a
 * BYTE-IDENTICAL runtime chunk, and this file WITHOUT the sink import costs
 * +8 B gz and moves nothing. At `/chat` 180 / 180 the pre-declared fallback
 * therefore executed: telemetry is server-side only (`src/instrumentation.ts`),
 * and the client-side gap is reported rather than paid for. See FS14_REPORT §4.
 *
 * `data-theme="dark"` is stamped literally: the cookie read lives in
 * `app/layout.tsx`, which by definition did not run if this is rendering.
 */
import './globals.css';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  return (
    <html lang="en" data-theme="dark" data-density="comfortable">
      <body>
        <main
          id="main-content"
          className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col items-center justify-center gap-4 px-6 text-center"
        >
          <h1 className="text-[20px] font-semibold text-primary">Console could not start</h1>
          <p className="text-sm text-secondary">
            The application shell failed to render. Nothing was lost — your work is stored where it
            was before this screen appeared. Reloading is usually enough.
          </p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center rounded-md bg-interactive px-4 text-sm font-medium text-on-accent transition-colors hover:bg-interactive-hover"
          >
            Reload the console
          </button>
        </main>
      </body>
    </html>
  );
}
