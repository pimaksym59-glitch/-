/**
 * FS13 §3.4 — the state-ownership locks.
 *
 * The hard rule since FS8: **nothing is owned by TanStack Query and Zustand at
 * the same time.** FS13 adds a state kind that is owned by neither — a browser-
 * local preference — so the locks it needs are the mirror image of FS11's: no
 * Query cache write anywhere, and no second copy of a preference.
 *
 * FS13 also has no server write at all: the account surface is read-only by
 * construction, because the contract carries no account mutation.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(process.cwd(), 'src');

function walk(dir: string): readonly string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const fs13Files = [
  join(SRC, 'widgets', 'settings'),
  join(SRC, 'widgets', 'profile'),
  join(SRC, 'features', 'change-settings'),
  join(SRC, 'features', 'explain-activity'),
].flatMap((dir) => walk(dir));

const read = (file: string) => readFileSync(file, 'utf8');

/** Source assertions must read CODE, not prose: every one of these files
 *  documents the rule it follows, so a naive grep matches the explanation
 *  instead of the implementation. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

describe('FS13 writes nothing to the server and nothing to the cache', () => {
  it('contains no mutation, no invalidation and no cache write', () => {
    for (const file of fs13Files) {
      const source = code(read(file));
      expect(source).not.toContain('useMutation');
      expect(source).not.toContain('invalidateQueries');
      expect(source).not.toContain('setQueryData');
      expect(source).not.toContain('queryClient');
    }
  });
});

describe('a preference has exactly one owner', () => {
  it('only the preferences module touches storage', () => {
    for (const file of fs13Files) {
      if (file.endsWith(join('model', 'preferences.ts'))) continue;
      const source = code(read(file));
      expect(source).not.toContain('localStorage');
      expect(source).not.toContain('createPersistStore');
    }
  });

  it('only the preferences module writes the muted-toasts cookie', () => {
    const writers = fs13Files.filter((file) => code(read(file)).includes('document.cookie ='));
    expect(writers).toHaveLength(1);
    expect(writers[0]).toContain('preferences.ts');
  });

  it('theme and density are NOT duplicated into the preferences payload', () => {
    const source = code(read(join(SRC, 'features', 'change-settings', 'model', 'preferences.ts')));
    // They keep the FS1 cookie mechanism that SSR reads — a second copy here is
    // exactly how two sources of truth start disagreeing.
    expect(source).not.toMatch(/theme:/);
    expect(source).not.toMatch(/density:/);
  });

  it('the appearance panel drives the shipped provider, not a local copy', () => {
    const panel = code(read(join(SRC, 'widgets', 'settings', 'AppearancePanel.tsx')));
    expect(panel).toContain('useTheme()');
    expect(panel).not.toContain('document.cookie');
    expect(panel).not.toContain('useState');
  });

  it('no FS13 module writes to the global UI store', () => {
    for (const file of fs13Files) {
      expect(code(read(file))).not.toContain('useUiStore.setState');
    }
  });
});

describe('the no-FOUC duty is preserved by construction', () => {
  it('leaves the SSR theme/density path untouched', () => {
    const layout = code(read(join(SRC, 'app', 'layout.tsx')));
    expect(layout).toContain('parseTheme');
    expect(layout).toContain('parseDensity');
    // FS13 added nothing to the file that flips tokens before paint.
    expect(layout.toLowerCase()).not.toContain('preference');
    expect(layout.toLowerCase()).not.toContain('experience');
    expect(layout.toLowerCase()).not.toContain('muted');
  });

  it('keeps the theme cookie contract exactly as FS1 defined it', () => {
    const theme = read(join(SRC, 'shared', 'config', 'theme.ts'));
    expect(theme).toContain("THEME_COOKIE = 'onyx-theme'");
    expect(theme).toContain("DENSITY_COOKIE = 'onyx-density'");
  });
});
