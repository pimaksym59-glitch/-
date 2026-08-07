/**
 * DATA-FIXTURE INTEGRITY (FS5 T-FS5.1 — the FS4 triple-lock pattern applied to
 * data): (b) every kill-switched fixture module THROWS at import in
 * staging/production; (c) no src/ module STATICALLY imports a kill-switched
 * fixture module — only lazy `import()` behind the env check is legal, so the
 * throw can never detonate in a legitimate production render path. Lock (a) —
 * the server-env refusal — is covered in auth-gateway.test.ts (shared guard).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const ENV_KEY = 'NEXT_PUBLIC_APP_ENV';
const originalEnv = process.env[ENV_KEY];

afterEach(() => {
  if (originalEnv === undefined) delete process.env.NEXT_PUBLIC_APP_ENV;
  else process.env[ENV_KEY] = originalEnv;
  vi.resetModules();
});

describe('data-fixture kill-switch (FS5 T-FS5.1)', () => {
  it('(b) guard/dataset/browser/meta THROW when imported in production/staging', async () => {
    for (const env of ['production', 'staging']) {
      process.env[ENV_KEY] = env;
      vi.resetModules();
      await expect(import('@/shared/lib/fixtures/guard')).rejects.toThrow(/DATA-FIXTURE INTEGRITY/);
      vi.resetModules();
      await expect(import('@/shared/lib/fixtures/dataset')).rejects.toThrow(
        /DATA-FIXTURE INTEGRITY/,
      );
      vi.resetModules();
      await expect(import('@/shared/lib/fixtures/meta')).rejects.toThrow(/DATA-FIXTURE INTEGRITY/);
    }
  });

  it('(b) the modules import cleanly in local (the legal environment)', async () => {
    process.env[ENV_KEY] = 'local';
    vi.resetModules();
    const { resolveFixture } = await import('@/shared/lib/fixtures/dataset');
    expect(resolveFixture('GET', '/api/v1/channels', 'default')?.status).toBe(200);
  });

  it('(c) no src/ module statically imports a kill-switched fixture module', () => {
    const SRC = join(__dirname, '..', '..', 'src');
    const FIXTURES_DIR = ['shared', 'lib', 'fixtures'].join(sep);
    // Static-import forms only; dynamic `import('…')` is the legal pattern.
    const STATIC_IMPORT =
      /(?:^|\n)\s*(?:import|export)[^;]*?from\s+['"]@\/shared\/lib\/fixtures\/(?:guard|dataset|browser|meta)['"]/;

    function* walk(dir: string): Generator<string> {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) yield* walk(full);
        else yield full;
      }
    }

    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const rel = relative(SRC, file);
      if (rel.startsWith(FIXTURES_DIR)) continue; // internal wiring is legal
      if (STATIC_IMPORT.test(readFileSync(file, 'utf8'))) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });
});
