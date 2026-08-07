/**
 * FS12 §3.4 — the state-ownership locks, plus the RBAC reconciliation (D11).
 *
 * The hard rule is unchanged since FS8: no state belongs to TanStack Query and
 * Zustand at once. FS12 adds a second, stricter one — one state kind (a secret
 * being typed) may not persist ANYWHERE, which `secret-writeonly.test.ts`
 * proves separately.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RBAC_MATRIX } from '@/shared/config/rbac';
import { ROUTES } from '@/shared/config/routes';
import { can } from '@/shared/lib/rbac';

const SRC = join(__dirname, '..', '..', 'src');
const stripComments = (source: string): string => source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

function collect(dir: string): readonly string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collect(full));
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

const readSlice = (layer: string, slice: string): string =>
  collect(join(SRC, layer, slice))
    .map((file) => stripComments(readFileSync(file, 'utf8')))
    .join('\n');

describe('read-only slices are read-only by construction', () => {
  it.each(['audit', 'probe', 'cost-report', 'config-version', 'platform-user', 'api-key'])(
    'entities/%s contains no mutation or cache write',
    (slice) => {
      const source = readSlice('entities', slice);
      expect(source).not.toContain('useMutation');
      expect(source).not.toContain('invalidateQueries');
      expect(source).not.toContain('setQueryData');
    },
  );

  it('the audit slice has no write path at all (the log is immutable)', () => {
    const source = readSlice('entities', 'audit');
    expect(source).not.toContain("method: 'POST'");
    expect(source).not.toContain("method: 'PATCH'");
    expect(source).not.toContain("method: 'DELETE'");
  });
});

describe('no FS12 state lives in Query and Zustand at once', () => {
  it.each([
    'manage-users',
    'rollback-config',
    'requeue-job',
    'rotate-key',
    'export-audit',
    'explain-job',
  ])('features/%s never writes the global UI store', (slice) => {
    const source = readSlice('features', slice);
    expect(source).not.toContain('useUiStore.setState');
    expect(source).not.toContain('useUiStore(');
  });

  it('the AI panel writes nothing to Query (streamed text is transient)', () => {
    const source = readSlice('features', 'explain-job');
    expect(source).not.toContain('useMutation');
    expect(source).not.toContain('invalidateQueries');
    expect(source).not.toContain('setQueryData');
    expect(source).toContain('useAssistantStream');
  });

  it('the export feature computes nothing and calls nothing', () => {
    const source = readSlice('features', 'export-audit');
    expect(source).not.toContain('apiFetch');
    expect(source).not.toContain('useQuery');
  });
});

describe('D11 — the RBAC mirror matches the frozen matrix', () => {
  it('admin no longer holds user or key management', () => {
    // API_SPEC: «Users/Roles, API keys, Security | owner ✓ | admin – ».
    expect(RBAC_MATRIX.admin).not.toContain('admin.users.manage');
    expect(RBAC_MATRIX.admin).not.toContain('admin.providers.manage');
    expect(can('owner', 'admin.users.manage')).toBe(true);
    expect(can('admin', 'admin.users.manage')).toBe(false);
    expect(can('owner', 'admin.providers.manage')).toBe(true);
    expect(can('admin', 'admin.providers.manage')).toBe(false);
  });

  it('admin keeps everything the matrix does grant it', () => {
    for (const permission of ['platform.view', 'platform.manage', 'content.publish'] as const) {
      expect(can('admin', permission)).toBe(true);
    }
  });

  it('jobs and providers are owner/admin only (the contract scopes the group)', () => {
    expect(ROUTES.jobs.permission).toBe('platform.manage');
    expect(ROUTES.providers.permission).toBe('platform.manage');
    for (const role of ['editor', 'analyst', 'viewer'] as const) {
      expect(can(role, 'platform.manage')).toBe(false);
    }
  });

  it('audit stays readable by analyst, exactly as the matrix says', () => {
    // API_SPEC: «Audit log (чтение) | owner ✓ | admin ✓ | editor – | analyst ✓ | viewer – ».
    expect(ROUTES.audit.permission).toBe('platform.view');
    expect(can('analyst', 'platform.view')).toBe(true);
    expect(can('editor', 'platform.view')).toBe(false);
    expect(can('viewer', 'platform.view')).toBe(false);
  });

  it('no other route permission moved', () => {
    expect(ROUTES.admin.permission).toBe('platform.manage');
    expect(ROUTES.health.permission).toBe('platform.view');
    expect(ROUTES.logs.permission).toBe('platform.view');
    expect(ROUTES.billing.permission).toBe('platform.view');
    expect(ROUTES.flags.permission).toBe('platform.manage');
    expect(ROUTES.notifications.permission).toBe('workspace.view');
  });
});

describe('no FS12 module reaches into a protected workspace slice', () => {
  const PROTECTED = [
    '@/entities/analytics',
    '@/entities/analytics-report',
    '@/entities/conversation',
    '@/entities/document',
    '@/entities/persona',
    '@/entities/image',
    '@/entities/prompt',
    '@/entities/job',
  ];

  it.each([
    ['entities', 'job-queue'],
    ['entities', 'platform-user'],
    ['entities', 'audit'],
    ['entities', 'probe'],
    ['entities', 'api-key'],
    ['entities', 'cost-report'],
    ['entities', 'config-version'],
    ['widgets', 'jobs'],
    ['widgets', 'admin'],
    ['widgets', 'audit'],
    ['widgets', 'health'],
    ['widgets', 'providers'],
    ['widgets', 'billing'],
  ])('%s/%s imports no protected slice', (layer, slice) => {
    const source = readSlice(layer, slice);
    for (const target of PROTECTED) {
      // Anchored on the closing quote or a sub-path so `@/entities/job` cannot
      // match `@/entities/job-queue` — the two are deliberately different
      // slices and the substring would make this lock vacuous.
      expect(source).not.toMatch(new RegExp(`${target}(['"/])`));
    }
  });

  it('entities/job-queue is fully independent of the FS5 entities/job', () => {
    const source = readSlice('entities', 'job-queue');
    expect(source).not.toContain('entities/job');
    expect(source).not.toContain('mapJob');
  });
});
