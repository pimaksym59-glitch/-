/**
 * AUTH INTEGRITY — guard (c) of the FS4 T-FS4.3 triple kill-switch.
 * The FS1/FS2 mock auth seam must not exist ANYWHERE in the source tree; this
 * test fails if any remnant (or a new stand-in using the old names) appears.
 * Guards (a) and (b): server-env refusal + fixture module-scope throw
 * (covered in auth-gateway.test.ts).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '..', '..', 'src');
const FORBIDDEN = ['mock-login', 'mock-logout', 'readMockSession'];

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

describe('auth integrity (FS4 T-FS4.3)', () => {
  it('no mock-auth remnant exists anywhere under src/', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const content = readFileSync(file, 'utf8');
      for (const marker of FORBIDDEN) {
        if (content.includes(marker)) offenders.push(`${file} → ${marker}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
