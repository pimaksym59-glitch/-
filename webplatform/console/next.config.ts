import type { NextConfig } from 'next';

/**
 * Next config (Stage 2 §8/§13, Stage 3 §9). Standalone output for a small
 * Docker image; strict security headers. CSP is Report-Only first (Stage 2
 * SEC-5) so it can be tuned against real telemetry before enforcement. Fonts
 * are self-hosted (next/font), so no external font host is needed.
 */
const isProd = process.env.NODE_ENV === 'production';

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  "connect-src 'self'",
  "form-action 'self'",
  "manifest-src 'self'",
].join('; ');

/**
 * FS14 T-FS14.11 — the CSP promotion package (Stage 2 SEC-5).
 *
 * **This is the header that would be ENFORCED, and it is deliberately not sent
 * yet.** Promotion is a runtime decision, not a code decision: the report-only
 * policy above has never been observed in a browser (it carries no `report-uri`
 * and no `report-to`, so it has always reported NOWHERE — the finding that
 * shaped this task), and enforcing a policy that was never observed would be a
 * gate this project fabricated rather than passed.
 *
 * Authored here so the promotion is a one-line change once FE-RV-17 answers:
 * swap the header key below from Report-Only to enforced.
 *
 * **The one open decision, with its cost, so it is not rediscovered later.**
 * `script-src` keeps `'unsafe-inline'` because Next's App Router emits inline
 * bootstrap and streaming-payload scripts on every RSC response. Removing it
 * means nonces, and a nonce must be generated per request — which opts every
 * static/ISR route into dynamic rendering. That is a real performance cost
 * against §F8.1, and it must be measured on staging, not guessed here.
 *
 * `img-src` still allows `data:` and `blob:`; the console renders no image
 * source at all today (§R6.8 — `storage_path` is an object key, FS9 D2), so
 * both are candidates for removal on promotion, and BOTH become relevant again
 * the day FE-RV-12 says a media URL exists.
 */
const securityHeaders = [
  { key: 'Content-Security-Policy-Report-Only', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  // Linting is a dedicated CI gate (flat config, `pnpm lint`); don't re-run
  // Next's legacy ESLint during build. Type errors still fail the build.
  eslint: { ignoreDuringBuilds: true },
  webpack(config, { isServer }) {
    if (isServer) {
      // `msw/browser` declares `node: null` in its exports map, so the SSR
      // compilation of the client graph (FixtureBoot's lazy worker import,
      // FS5 T-FS5.1) must alias it away; the browser bundle resolves it
      // normally. The worker itself only ever starts in local/ci.
      config.resolve.alias = { ...config.resolve.alias, 'msw/browser': false };
    }
    return config;
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
