/**
 * Per-route First Load JS budget gate (Stage 2 §9 / FS3 T-FS3.1, closes FS2 R3).
 *
 * Runs `next build` and parses Next's own route table — the authoritative
 * per-route "First Load JS" figure (gzipped, deduplicated; lazy `dynamic()`
 * chunks are correctly excluded). Fails with a non-zero exit code if any route
 * exceeds the budget, so the number can no longer be "read by eye".
 *
 * The full build output is captured (never piped through a truncating filter —
 * see PROJECT_HANDOFF_PART4 §3.1) and a machine-readable snapshot is written to
 * `.next/route-budget.json` for reports.
 *
 * Usage:  node scripts/check-route-budget.mjs [--budget-kb=180]
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const BUDGET_KB = Number(
  process.argv.find((a) => a.startsWith('--budget-kb='))?.split('=')[1] ?? 180,
);

// pnpm resolves the local `next` binary; shell:true is required on Windows.
const build = spawnSync('pnpm', ['exec', 'next', 'build'], {
  encoding: 'utf8',
  shell: true,
  maxBuffer: 64 * 1024 * 1024,
});

process.stdout.write(build.stdout ?? '');
process.stderr.write(build.stderr ?? '');
if (build.status !== 0) {
  console.error(`\n[budget] next build failed (exit ${build.status}) — no budget verdict.`);
  process.exit(build.status ?? 1);
}

/** Parse lines like: `├ ƒ /dashboard   1.56 kB   168 kB` (glyphs vary). */
const ROUTE_LINE = /^[┌├└]\s+\S+\s+(\/\S*)\s+([\d.]+)\s+(B|kB|MB)\s+([\d.]+)\s+(B|kB|MB)\s*$/u;
const toKb = (value, unit) => (unit === 'MB' ? value * 1000 : unit === 'B' ? value / 1000 : value);

const routes = [];
for (const raw of (build.stdout ?? '').split(/\r?\n/)) {
  const match = ROUTE_LINE.exec(raw.trim());
  if (!match) continue;
  const [, route, size, sizeUnit, firstLoad, firstLoadUnit] = match;
  routes.push({
    route,
    sizeKb: toKb(Number(size), sizeUnit),
    firstLoadKb: toKb(Number(firstLoad), firstLoadUnit),
  });
}

if (routes.length === 0) {
  console.error('[budget] Could not parse any route from the build output — gate cannot pass.');
  process.exit(1);
}

routes.sort((a, b) => b.firstLoadKb - a.firstLoadKb);
const over = routes.filter((r) => r.firstLoadKb > BUDGET_KB);
const worst = routes[0];

writeFileSync(
  '.next/route-budget.json',
  JSON.stringify({ budgetKb: BUDGET_KB, worst, routes }, null, 2),
);

console.log(`\n[budget] ${routes.length} routes parsed · budget ${BUDGET_KB} kB per route`);
console.log(
  `[budget] worst route: ${worst.route} at ${worst.firstLoadKb} kB ` +
    `(headroom ${(BUDGET_KB - worst.firstLoadKb).toFixed(1)} kB)`,
);
if (over.length > 0) {
  console.error(`[budget] FAIL — ${over.length} route(s) over budget:`);
  for (const r of over) console.error(`  ${r.route}: ${r.firstLoadKb} kB > ${BUDGET_KB} kB`);
  process.exit(1);
}
console.log('[budget] PASS — every route is within budget.');
