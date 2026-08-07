import { describe, expect, it } from 'vitest';
import { can, canAll, canAny } from '@/shared/lib/rbac';

describe('rbac can()', () => {
  it('grants the owner everything', () => {
    expect(can('owner', 'admin.users.manage')).toBe(true);
    expect(can('owner', 'analytics.view')).toBe(true);
  });

  it('restricts viewers to read-only permissions', () => {
    expect(can('viewer', 'content.view')).toBe(true);
    expect(can('viewer', 'content.edit')).toBe(false);
    expect(can('viewer', 'platform.manage')).toBe(false);
  });

  it('supports any/all combinators', () => {
    expect(canAny('analyst', ['content.edit', 'analytics.view'])).toBe(true);
    expect(canAll('editor', ['content.edit', 'content.publish'])).toBe(true);
    expect(canAll('editor', ['content.edit', 'admin.users.manage'])).toBe(false);
  });
});
