#!/usr/bin/env node
/**
 * FS15 T-FS15.4.1 — secrets-in-bundle scan (D3 Option A: a one-off
 * verification script, NOT wired into `ci.yml` as a blocking gate).
 *
 * Greps the BUILT output (`.next/standalone` + `.next/static`) for
 * credential-shaped strings. This checks what actually ships, not source —
 * `NEXT_PUBLIC_*` values are the only environment values Next.js ever
 * inlines into a client bundle by design (`shared/config/env.ts`); this
 * script's job is to catch the case where something ELSE leaked in.
 *
 * Must be run AFTER a real `pnpm build` (the `.next` directory it scans does
 * not exist otherwise). Exits 1 on any hit, printing the file and the
 * matched pattern — never the full secret value.
 *
 * This is a one-off verification, run once at FS15 and recorded in
 * `FS15_REPORT.md` with its output. It stays in `scripts/` as a reusable
 * tool a later stage or a real CI run can invoke again — see
 * PRODUCTION_READINESS_RUNBOOK.md item 3 for wiring it in as a standing
 * check, which this stage deliberately did not do (D3).
 *
 * `node_modules/**` is EXCLUDED from the walk (verified necessary, not
 * assumed): the first real run of this script matched the AWS-access-key
 * pattern inside Next's own vendored `amphtml-validator` WASM blob
 * (`node_modules/next/dist/compiled/amphtml-validator/validator_wasm.js`,
 * confirmed by inspecting the byte context — a base32-shaped WASM data
 * literal, not a credential). Next only ever inlines THIS project's
 * `NEXT_PUBLIC_*` values into its OWN compiled output
 * (`.next/standalone/.next/**`, `.next/static/**`); it cannot inline
 * anything into an unrelated third-party package's own vendored file, so
 * scanning `node_modules` checks a surface this project's secrets could
 * never reach and produces exactly this kind of false positive on binary
 * data instead. Reported in `FS15_REPORT.md`, not silently fixed.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = [join(ROOT, '.next', 'standalone'), join(ROOT, '.next', 'static')];

// Generic credential shapes — never legitimate in a client bundle.
const GENERIC_PATTERNS = [
  { name: 'OpenAI-style secret key', re: /sk-[A-Za-z0-9]{20,}/g },
  { name: 'AWS access key id', re: /AKIA[0-9A-Z]{16}/g },
  { name: 'PEM private key header', re: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g },
  { name: 'Postgres connection string', re: /postgres(?:ql)?(?:\+asyncpg)?:\/\/[^\s"']+/g },
  { name: 'Redis connection string with credentials', re: /redis:\/\/[^\s"']*:[^\s"'@]+@/g },
  { name: 'Bearer token literal', re: /Bearer [A-Za-z0-9\-._~+/]{20,}=*/g },
];

// The backend's own named secret env vars (root .env.example) — must never
// appear as a literal NAME=VALUE assignment in a client bundle. Matching the
// bare variable NAME is deliberately excluded (it appears harmlessly in
// error messages/types); only an `=`-assignment shape counts as a leak.
const NAMED_SECRET_ASSIGNMENTS = [
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'TELEGRAM_BOT_TOKEN',
  'POSTGRES_PASSWORD',
].map((name) => ({
  name: `${name} assignment`,
  re: new RegExp(`${name}\\s*[=:]\\s*['"]?[A-Za-z0-9\\-._]{8,}`, 'g'),
}));

const PATTERNS = [...GENERIC_PATTERNS, ...NAMED_SECRET_ASSIGNMENTS];

const SCANNABLE_EXT = new Set(['.js', '.mjs', '.cjs', '.json', '.txt', '.html']);

function walk(dir, hits) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // directory absent (e.g. .next/standalone before a standalone build)
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Vendored third-party code — see the file header for why this is
      // excluded rather than left to produce false positives on binary blobs.
      if (entry.name === 'node_modules') continue;
      walk(full, hits);
      continue;
    }
    if (!SCANNABLE_EXT.has(extname(entry.name))) continue;
    const size = statSync(full).size;
    if (size > 20 * 1024 * 1024) continue; // skip anything absurdly large (source maps etc.)
    const text = readFileSync(full, 'utf8');
    for (const pattern of PATTERNS) {
      pattern.re.lastIndex = 0;
      if (pattern.re.test(text)) {
        hits.push({ file: full, pattern: pattern.name });
      }
    }
  }
}

let anyDirExisted = false;
const hits = [];
for (const dir of TARGET_DIRS) {
  try {
    statSync(dir);
    anyDirExisted = true;
  } catch {
    continue;
  }
  walk(dir, hits);
}

if (!anyDirExisted) {
  console.error(
    '[check-no-secrets] No .next/standalone or .next/static directory found. ' +
      'Run `pnpm build` first — this script scans BUILD OUTPUT, not source.',
  );
  process.exit(2);
}

if (hits.length > 0) {
  console.error(`[check-no-secrets] FAIL — ${hits.length} suspicious pattern(s) found:`);
  for (const hit of hits) {
    console.error(`  - ${hit.pattern} in ${hit.file}`);
  }
  process.exit(1);
}

console.log(
  `[check-no-secrets] PASS — 0 hits across ${TARGET_DIRS.length} build output ` +
    `director${TARGET_DIRS.length === 1 ? 'y' : 'ies'}, ${PATTERNS.length} patterns checked.`,
);
