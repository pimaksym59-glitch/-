/**
 * FS13 T-FS13.9 — the privacy lock.
 *
 * `GET /audit-log?actor=` is the only call that can answer "what have I done".
 * The failure mode it invites is specific and serious: if the actor is ever
 * dropped — a null user id treated as "no filter" — a personal activity feed
 * silently becomes the **platform-wide audit log**. That is a privacy leak
 * dressed as a graceful fallback, and it would look like a feature working.
 *
 * The enforcement is a TYPE plus a component boundary, not a habit:
 * `useMyActivity` takes a non-nullable `string`, so a caller holding
 * `string | null` cannot invoke it at all, and React's rules of hooks make a
 * conditional call impossible. This file asserts that arrangement at source
 * level — the FS10 arity technique applied to a privacy guarantee.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { useMyActivity } from '@/widgets/profile/useMyActivity';

const PROFILE = join(process.cwd(), 'src', 'widgets', 'profile');
const read = (file: string) => readFileSync(join(PROFILE, file), 'utf8');

describe('the actor can never be null on the wire', () => {
  it('takes exactly one argument, and the type forbids null', () => {
    // Arity, not call-site inspection (the FS10 lock): a second optional
    // parameter would be the way someone later "made it flexible".
    expect(useMyActivity.length).toBe(1);
    const source = read('useMyActivity.ts');
    expect(source).toContain('userId: string');
    expect(source).not.toContain('userId: string | null');
    expect(source).not.toContain('userId?:');
  });

  it('passes the actor through to the audit query, never a literal null', () => {
    const source = read('useMyActivity.ts');
    expect(source).toContain('useAuditRecords(null, userId)');
    // The FIRST argument is the entity facet, which this surface never sets;
    // the SECOND is the actor and must never be hard-coded to null.
    expect(source).not.toContain('useAuditRecords(null, null)');
  });

  it('normalises a BLANK id to absent, not to "no filter"', () => {
    // The defect this guards against was real and found by a component test:
    // `session.userId` read directly lets `''` past a null check, and
    // `auditPaths.list` drops a falsy actor from the query string — which turns
    // a personal feed into the platform-wide audit log. The panel must go
    // through `toIdentity`, which maps '' to null.
    const panel = read('ActivityPanel.tsx');
    expect(panel).toContain('toIdentity(session)?.userId');
    expect(panel).not.toContain('session?.userId ?? null');
    expect(read('identity.ts')).toContain("session.userId === '' ? null : session.userId");
  });

  it('renders an absence — not an unfiltered list — when there is no user id', () => {
    const panel = read('ActivityPanel.tsx');
    expect(panel).toContain('userId === null');
    // The absence must be reachable BEFORE the list component is rendered.
    const guardAt = panel.indexOf('userId === null');
    const listAt = panel.indexOf('<ActivityList');
    expect(guardAt).toBeGreaterThan(-1);
    expect(guardAt).toBeLessThan(listAt);
  });

  it('is the only module in the profile widget that reads audit records', () => {
    const others = ['ProfileView.tsx', 'identity.ts', 'ProfileHonesty.tsx'];
    for (const file of others) {
      expect(read(file)).not.toContain('useAuditRecords');
    }
  });
});

describe('the permission gate matches the frozen matrix', () => {
  it('checks the same permission that gates /audit before fetching anything', () => {
    const panel = read('ActivityPanel.tsx');
    expect(panel).toContain("can('platform.view')");
    const permAt = panel.indexOf("can('platform.view')");
    const listAt = panel.indexOf('<ActivityList');
    expect(permAt).toBeLessThan(listAt);
  });

  it('gates the AI row on content.edit, separately from reading', () => {
    expect(read('ActivityPanel.tsx')).toContain("can('content.edit')");
  });
});
