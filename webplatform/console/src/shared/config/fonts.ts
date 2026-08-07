/**
 * Self-hosted variable fonts (D2 §3, Stage 2 §2) — **pinned binaries since
 * FS14** (Gate C, plan §5.2 D7 Option A; closes FE-RV-5).
 *
 * `next/font/local` reads the two `.woff2` files committed under
 * `public/fonts/`, so the build needs no network at all and the exact binaries
 * are fixed by the repository rather than by whatever Google serves on the day.
 * Serving is unchanged — `/_next/static`, no runtime CDN, CSP-safe — and so is
 * everything downstream: the CSS variables `--font-inter` / `--font-jetbrains`
 * keep their names, `tokens.css` and `app/layout.tsx` are byte-identical, and
 * the no-FOUC duty (theme/density applied server-side from the cookie) is
 * untouched because this file never participated in it.
 *
 * **What the pin narrows, stated plainly.** These are the LATIN subsets — the
 * ones this module has always requested (`subsets: ['latin']`) and the only
 * ones Next preloaded. The Google stylesheet additionally declared Cyrillic,
 * Greek, Vietnamese and latin-ext faces behind `unicode-range`, which
 * `next/font/local` cannot express; those ranges now fall back to the system
 * stack in `--font-sans` / `--font-mono` (`tokens.css` §Typography). English UI
 * copy is unaffected; non-Latin CONTENT (a channel writing in Cyrillic) renders
 * in the fallback face rather than in Inter's Cyrillic. That is the cost of
 * pinning, it is reversible in this one file, and FS14_REPORT §5 records it.
 *
 * Both files are variable, so one binary serves every weight the design uses
 * (D2 §3: 400/500/600/700 sans, 400/500 mono).
 */
import localFont from 'next/font/local';

export const fontInter = localFont({
  src: [{ path: '../../../public/fonts/Inter-latin.woff2', weight: '100 900', style: 'normal' }],
  variable: '--font-inter',
  display: 'swap',
  // Metric-matched fallback keeps layout stable while the face loads (D4 §8).
  fallback: ['-apple-system', 'Segoe UI', 'system-ui', 'sans-serif'],
});

export const fontJetBrains = localFont({
  src: [
    {
      path: '../../../public/fonts/JetBrainsMono-latin.woff2',
      weight: '100 800',
      style: 'normal',
    },
  ],
  variable: '--font-jetbrains',
  display: 'swap',
  fallback: ['SF Mono', 'ui-monospace', 'Menlo', 'monospace'],
});

/** Combined font CSS-variable class list for the root <html> element. */
export const fontVariables = `${fontInter.variable} ${fontJetBrains.variable}`;
