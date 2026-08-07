#!/usr/bin/env node
/**
 * FS15 T-FS15.4.3 — a LOCAL Lighthouse pass (D4 Option A, owner-approved).
 *
 * **This measures a workstation, not staging or production.** It runs
 * `next start` (the fixture-backed production server) against Chromium on
 * this machine, over `localhost`, with no CDN, no edge cache and no real
 * network latency. §F8.1 asks for "a mid-tier device, staging" — this script
 * cannot produce that measurement, and its numbers must never be reported as
 * if it did (Production Readiness Runbook item 5 carries the real, still-open
 * ask). What this script gives instead is real signal that no prior FS stage
 * had: an actual Lighthouse run over the shipped, budget-optimized bundle.
 *
 * Why a hand-rolled Chromium launch: this workstation has no system Chrome on
 * `PATH`, and invoking the Playwright-bundled `chrome.exe` directly (the way
 * Lighthouse's own `chrome-launcher` tries to) fails here with a Windows
 * side-by-side (WinSxS) configuration error — verified directly, not
 * assumed, while authoring this script. Playwright itself launches that same
 * binary successfully (its own launcher sets up the environment
 * `chrome-launcher` does not), so this script asks Playwright to start
 * Chromium with `--remote-debugging-port` open and points the Lighthouse CLI
 * at that existing instance via `--port`, instead of letting Lighthouse spawn
 * its own.
 *
 * Requires a production build already in `.next/` (`pnpm build`) and a
 * fixture login (`NEXT_PUBLIC_APP_ENV=local`, the default) so `/chat` and
 * `/dashboard` render as an authenticated user would see them.
 *
 * Usage:  node scripts/lighthouse-local.mjs
 * Output: <repo>/webplatform/console/.lighthouse/<route>.json (gitignored)
 */
import { chromium } from '@playwright/test';
import { execFile } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const PORT = 3000;
const CDP_PORT = 9222;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = join(process.cwd(), '.lighthouse');
const ROUTES = ['/login', '/chat', '/dashboard'];
const FIXTURE_CREDENTIALS = { email: 'owner@console.local', password: 'console-demo' };

mkdirSync(OUT_DIR, { recursive: true });

async function waitForServer(url, attempts = 20) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server at ${url} did not respond after ${attempts} attempts.`);
}

async function login() {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(FIXTURE_CREDENTIALS),
  });
  if (!res.ok) throw new Error(`Fixture login failed: HTTP ${res.status}`);
  const setCookies = res.headers.getSetCookie?.() ?? [];
  const cookie = setCookies.map((c) => c.split(';')[0]).join('; ');
  if (!cookie) throw new Error('Fixture login returned no Set-Cookie header.');
  return cookie;
}

// MUST be async (execFile, not execFileSync). The synchronous form blocks
// this process's event loop for the whole Lighthouse run, which starves the
// Playwright browser connection sharing that same process — the first real
// run of this script failed with "Protocol error: Target closed" for
// exactly that reason (verified by switching to the async form, which fixed
// it). Playwright's own CDP session needs the event loop free to stay alive
// while a SEPARATE CDP client (Lighthouse) drives the same browser.
async function runLighthouse(url, outPath, cookie) {
  const args = [
    '--yes',
    'lighthouse',
    url,
    '--output=json',
    `--output-path=${outPath}`,
    `--port=${CDP_PORT}`,
    '--only-categories=performance,accessibility',
    '--form-factor=desktop',
    '--screenEmulation.disabled',
    '--quiet',
  ];
  // A FILE PATH, not inline JSON: `--extra-headers="{...}"` mangled under
  // Windows cmd.exe's shell-quoting (`;` and nested `"` broke the first real
  // run's parse). `--extra-headers=./path/to/file.json` is Lighthouse's own
  // documented alternative and sidesteps shell quoting entirely.
  let headersPath;
  if (cookie) {
    headersPath = join(OUT_DIR, `.headers-${Date.now()}.json`);
    writeFileSync(headersPath, JSON.stringify({ Cookie: cookie }));
    args.push(`--extra-headers=${headersPath}`);
  }
  try {
    await execFileAsync('npx', args, { shell: true, maxBuffer: 1024 * 1024 * 32 });
  } finally {
    if (headersPath) rmSync(headersPath, { force: true });
  }
}

function summarize(outPath) {
  const r = JSON.parse(readFileSync(outPath, 'utf8'));
  const a = r.audits;
  return {
    finalUrl: r.finalUrl,
    performanceScore: r.categories.performance.score,
    accessibilityScore: r.categories.accessibility.score,
    fcp: a['first-contentful-paint'].displayValue,
    lcp: a['largest-contentful-paint'].displayValue,
    tbt: a['total-blocking-time'].displayValue,
    cls: a['cumulative-layout-shift'].displayValue,
    speedIndex: a['speed-index'].displayValue,
    tti: a['interactive']?.displayValue ?? null,
  };
}

console.log(
  '[lighthouse-local] WORKSTATION MEASUREMENT ONLY — see file header. Not staging evidence.',
);
console.log(`[lighthouse-local] waiting for ${BASE_URL} ...`);
await waitForServer(BASE_URL);

console.log('[lighthouse-local] logging in as the fixture owner account ...');
const cookie = await login();

console.log(
  `[lighthouse-local] launching Playwright-managed Chromium with CDP on :${CDP_PORT} ...`,
);
const browser = await chromium.launch({
  headless: true,
  args: [`--remote-debugging-port=${CDP_PORT}`],
});

const summaries = {};
try {
  for (const route of ROUTES) {
    const needsAuth = route !== '/login';
    const outPath = join(OUT_DIR, `${route.replace(/\//g, '') || 'root'}.json`);
    console.log(
      `[lighthouse-local] auditing ${route} ${needsAuth ? '(authenticated)' : '(public)'} ...`,
    );
    await runLighthouse(`${BASE_URL}${route}`, outPath, needsAuth ? cookie : undefined);
    summaries[route] = summarize(outPath);
  }
} finally {
  await browser.close();
}

writeFileSync(join(OUT_DIR, 'summary.json'), JSON.stringify(summaries, null, 2));
console.log('\n[lighthouse-local] WORKSTATION results (not staging/production evidence):');
for (const [route, s] of Object.entries(summaries)) {
  console.log(
    `  ${route}: perf=${s.performanceScore} a11y=${s.accessibilityScore} FCP=${s.fcp} LCP=${s.lcp} TBT=${s.tbt} CLS=${s.cls} TTI=${s.tti ?? 'n/a'}`,
  );
}
console.log(`\n[lighthouse-local] full reports in ${OUT_DIR}`);
