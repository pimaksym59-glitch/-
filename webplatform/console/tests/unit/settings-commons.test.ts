/**
 * FS13 T-FS13.1 — the zero-commons locks, at source level.
 *
 * `/chat` sits at 180 / 180 kB. That makes "add no commons rows" a gate rather
 * than a target, and this file is what keeps it mechanical instead of careful.
 *
 * FS13 aimed lower than its predecessors: it declares **no query key, no
 * endpoint path and no fetcher of its own**, because it introduces no server
 * resource. Identity is the FS4 session; activity is FS12's audit slice. Both
 * are consumed, neither is opened.
 *
 * The one commons edit the plan predicted (`⌘,`) and the one it did not (the
 * D5-B toast-mute read side, which FSD requires to live in `shared/`) are both
 * asserted here explicitly, so their presence is a recorded fact rather than a
 * surprise found later in a diff.
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

const FS13_DIRS = [
  join(SRC, 'widgets', 'settings'),
  join(SRC, 'widgets', 'profile'),
  join(SRC, 'features', 'change-settings'),
  join(SRC, 'features', 'explain-activity'),
];

const fs13Files = FS13_DIRS.flatMap((dir) => walk(dir));
const read = (file: string) => readFileSync(file, 'utf8');

/** Source assertions must read CODE, not prose: every one of these files
 *  documents the rule it follows, so a naive grep matches the explanation
 *  instead of the implementation. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

describe('commons is not opened for keys, paths or fetchers', () => {
  it('adds ZERO rows to the shared query-key module', () => {
    const source = read(join(SRC, 'shared', 'config', 'query-keys.ts'));
    for (const word of ['account', 'preference', 'profile', 'settings', 'activity']) {
      expect(source.toLowerCase()).not.toContain(`${word}:`);
    }
  });

  it('adds ZERO rows to the shared endpoints module', () => {
    const source = read(join(SRC, 'shared', 'lib', 'api', 'endpoints.ts'));
    for (const word of ['preferences', 'users/me', 'profile']) {
      expect(source).not.toContain(word);
    }
  });

  it('declares no query key of its own — it reuses FS12’s audit keys', () => {
    for (const file of fs13Files) {
      const source = code(read(file));
      expect(source).not.toMatch(/Keys\s*=\s*\{/);
      expect(source).not.toMatch(/queryKey:\s*\[/);
    }
  });

  it('declares no endpoint path and calls apiFetch nowhere', () => {
    for (const file of fs13Files) {
      const source = code(read(file));
      expect(source).not.toContain('apiFetch');
      expect(source).not.toMatch(/Paths\s*=\s*\{/);
      expect(source).not.toContain("'/api/v1");
    }
  });
});

describe('the frozen slices stay frozen', () => {
  it('does not extend entities/session — it is in EVERY route’s First Load', () => {
    const barrel = read(join(SRC, 'entities', 'session', 'index.ts'));
    expect(barrel).toContain('useSessionQuery');
    // Nothing profile-shaped was added to a slice AuthProvider pulls into commons.
    expect(barrel.toLowerCase()).not.toContain('identity');
    expect(barrel.toLowerCase()).not.toContain('profile');
  });

  it('does not extend entities/audit — FS13 consumes its shipped API only', () => {
    const barrel = read(join(SRC, 'entities', 'audit', 'index.ts'));
    expect(barrel.toLowerCase()).not.toContain('activity');
    expect(barrel.toLowerCase()).not.toContain('mine');
  });

  it('registers no new Inspector row and no new palette group (D9)', () => {
    const inspector = read(join(SRC, 'widgets', 'inspector', 'Inspector.tsx'));
    expect(inspector.toLowerCase()).not.toContain('settings');
    expect(inspector.toLowerCase()).not.toContain('activity');
    // The activity list opens FS12's already-registered `audit` view instead.
    expect(read(join(SRC, 'widgets', 'profile', 'ActivityPanel.tsx'))).toContain("type: 'audit'");
  });
});

describe('the two commons edits FS13 really makes are declared', () => {
  it('⌘, is the ONE keyboard row, measured before it shipped', () => {
    const provider = read(join(SRC, 'shared', 'providers', 'ShortcutProvider.tsx'));
    expect(provider).toContain("key === ','");
    expect(provider).toContain('ROUTES.settings.path');
  });

  it('the D5-B read side lives in shared/ because FSD forbids the alternative', () => {
    const muted = code(read(join(SRC, 'shared', 'lib', 'notifications', 'muted-toasts.ts')));
    // No storage primitive in commons: a cookie read, nothing more.
    expect(muted).not.toContain('persist');
    expect(muted).not.toContain('localStorage');
    expect(muted).not.toContain('import ');
    expect(muted).toContain('document.cookie');
  });

  it('the provider consults it and refuses danger before reading anything', () => {
    const provider = read(join(SRC, 'shared', 'providers', 'NotificationProvider.tsx'));
    expect(provider).toContain('isToastKindMuted(kind)');
    const muted = read(join(SRC, 'shared', 'lib', 'notifications', 'muted-toasts.ts'));
    expect(muted).toContain('UNMUTABLE_TOAST_KIND');
  });
});
